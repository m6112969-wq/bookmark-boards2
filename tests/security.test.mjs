import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../assets/js/security.js';
const {parseBookmarkURL,normalizeData}=globalThis.BoardSecurity;
const sample=()=>({activeBoardId:'b',folders:[],boards:[{id:'b',name:'ボード',posts:[],folderId:null}]});
test('bookmark parser permits only supported hosts and strips tracking',()=>{
    for(const url of ['javascript:alert(1)?v=dQw4w9WgXcQ','data:text/html,<script>alert(1)</script>','https://evil.example/watch?v=dQw4w9WgXcQ','https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ','https://youtube.com@evil.example/watch?v=dQw4w9WgXcQ','https://user:password@youtube.com/watch?v=dQw4w9WgXcQ','https://x.com.evil.example/user/status/123'])assert.equal(parseBookmarkURL(url),null,url);
    assert.equal(parseBookmarkURL('https://youtu.be/dQw4w9WgXcQ?si=tracking').url,'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(parseBookmarkURL('https://twitter.com/user/status/123?utm_source=tracking').url,'https://x.com/i/status/123');
});
test('schema rejects oversized, duplicate or malformed imports and removes unrecognized properties',()=>{
    const input=sample();input.boards[0].posts=[{id:'p',type:'note',title:'<img src=x onerror=alert(1)>',body:'text',tags:['tag']}];
    input.boards[0].unexpected='not retained';
    const output=normalizeData(input);
    assert.equal(output.boards[0].posts[0].title,input.boards[0].posts[0].title,'text is preserved for safe DOM rendering');
    assert.equal('unexpected' in output.boards[0],false);
    const bad=sample();bad.boards[0].posts=[{id:'p',type:'youtube',youtubeId:'dQw4w9WgXcQ',url:'javascript:alert(1)',tags:[]}];assert.throws(()=>normalizeData(bad));
    assert.throws(()=>normalizeData({...sample(),boards:Array(101).fill({})}));
    const duplicate=sample();duplicate.boards.push({...duplicate.boards[0]});assert.throws(()=>normalizeData(duplicate));
    const prototype=JSON.parse('{"activeBoardId":"b","boards":[{"id":"b","name":"test","posts":[],"__proto__":{"polluted":true}}],"folders":[]}');
    normalizeData(prototype);assert.equal({}.polluted,undefined);
});
