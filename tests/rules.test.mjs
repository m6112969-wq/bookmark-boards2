import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, collectionGroup, getDocs } from 'firebase/firestore';
let env;
const verifiedGoogle={email_verified:true,firebase:{sign_in_provider:'google.com'}};
before(async()=>{
    env=await initializeTestEnvironment({projectId:'demo-bookmark-boards',firestore:{rules:await readFile('firestore.rules','utf8')}});
});
beforeEach(async()=>env.clearFirestore());
after(async()=>{await env?.cleanup();});
const payload=(revision,name='board')=>({revision,data:{activeBoardId:name,boards:[],folders:[]}});
const path=uid=>`users/${uid}/settings/appData`;
const dbFor=uid=>env.authenticatedContext(uid,verifiedGoogle).firestore();

test('all verified Google accounts can use their own documents, including the original account',async()=>{
    const users=['alice','bob','existing-user'];
    for(const uid of users){
        const db=dbFor(uid);
        await assertSucceeds(setDoc(doc(db,path(uid)),payload(1,uid)));
        const own=await assertSucceeds(getDoc(doc(db,path(uid))));
        assert.equal(own.data().data.activeBoardId,uid);
        await assertSucceeds(setDoc(doc(db,path(uid)),payload(2,uid)));
        for(const other of users.filter(other=>other!==uid)){
            await assertFails(getDoc(doc(db,path(other))));
            await assertFails(setDoc(doc(db,path(other)),payload(3,'unauthorized')));
            await assertFails(deleteDoc(doc(db,path(other))));
        }
        await assertFails(getDocs(collection(db,'users')));
        await assertFails(getDocs(collectionGroup(db,'settings')));
    }
});

test('unauthenticated, unverified and non-Google identities cannot use the app data',async()=>{
    const clients=[env.unauthenticatedContext(),env.authenticatedContext('alice',{email_verified:false,firebase:{sign_in_provider:'google.com'}}),env.authenticatedContext('alice',{email_verified:true,firebase:{sign_in_provider:'anonymous'}})];
    for(const client of clients){
        const db=client.firestore();
        await assertFails(getDoc(doc(db,path('alice'))));
        await assertFails(setDoc(doc(db,path('alice')),payload(1)));
    }
});

test('revision and schema restrictions still apply to every user',async()=>{
    for(const uid of ['alice','bob']){
        const db=dbFor(uid),ref=doc(db,path(uid));
        await assertSucceeds(setDoc(ref,payload(1)));
        await assertFails(setDoc(ref,payload(1)));
        await assertFails(setDoc(ref,{revision:2,data:{boards:'invalid'}}));
        await assertFails(setDoc(ref,{revision:2,data:{...payload(2).data,unexpected:'value'}}));
        await assertFails(setDoc(ref,{revision:2,data:{...payload(2).data,boards:Array(101).fill({})}}));
        await assertSucceeds(setDoc(ref,payload(2)));
        await assertFails(deleteDoc(ref));
        await assertFails(setDoc(doc(db,'unrelated/document'),payload(1)));
    }
});
