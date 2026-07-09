const DOMPurify = require('isomorphic-dompurify');
const html = '<h3>1.&nbsp;Workshop&nbsp;Objectives</h3><p><span style="background-color: transparent; color: rgb(0, 0, 0);">Test</span></p>';
console.log('Sanitized output:');
console.log(DOMPurify.sanitize(html));
