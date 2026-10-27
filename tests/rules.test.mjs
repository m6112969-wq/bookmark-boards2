import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, collectionGroup, getDocs } from 'firebase/firestore';
let env,ownerUid;
const verifiedGoogle={email_verified:true,firebase:{sign_in_provider:'google.com'}};
before(async()=>{
    const rules=await readFile('firestore.rules','utf8');
    ownerUid=rules.match(/request\.auth\.uid == '([^']+)'/)?.[1];
    assert.ok(ownerUid,'Owner UID must be configured');
    env=await initializeTestEnvironment({projectId:'demo-bookmark-boards',firestore:{rules}});
});
beforeEach(async()=>env.clearFirestore());
after(async()=>{await env?.cleanup();});
const payload=(revision,name='board')=>({revision,data:{activeBoardId:name,boards:[],folders:[]}});
const path=uid=>`users/${uid}/settings/appData`;
const dbFor=uid=>env.authenticatedContext(uid,verifiedGoogle).firestore();

test('only the configured owner can read and write; other verified Google users are denied',async()=>{
    const db=dbFor(ownerUid);
    await assertSucceeds(setDoc(doc(db,path(ownerUid)),payload(1)));
    await assertSucceeds(getDoc(doc(db,path(ownerUid))));
    await assertSucceeds(setDoc(doc(db,path(ownerUid)),payload(2)));
    for(const uid of ['alice','bob']){
        await env.withSecurityRulesDisabled(async context=>setDoc(doc(context.firestore(),path(uid)),payload(1)));
        const other=dbFor(uid);
        await assertFails(getDoc(doc(other,path(ownerUid))));
        await assertFails(setDoc(doc(other,path(ownerUid)),payload(3)));
        await assertFails(getDoc(doc(other,path(uid))));
        await assertFails(setDoc(doc(other,path(uid)),payload(2)));
        await assertFails(setDoc(doc(other,path(uid+'-new')),payload(1)));
        await assertFails(getDoc(doc(db,path(uid))));
        await assertFails(setDoc(doc(db,path(uid)),payload(2)));
    }
    await assertFails(getDocs(collection(db,'users')));
    await assertFails(getDocs(collectionGroup(db,'settings')));
});

test('unauthenticated, unverified and non-Google identities cannot use the app data',async()=>{
    const clients=[env.unauthenticatedContext(),env.authenticatedContext(ownerUid,{email_verified:false,firebase:{sign_in_provider:'google.com'}}),env.authenticatedContext(ownerUid,{email_verified:true,firebase:{sign_in_provider:'anonymous'}})];
    for(const client of clients){
        const db=client.firestore();
        await assertFails(getDoc(doc(db,path(ownerUid))));
        await assertFails(setDoc(doc(db,path(ownerUid)),payload(1)));
    }
});

test('revision and schema restrictions still apply to the owner',async()=>{
    for(const uid of [ownerUid]){
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
