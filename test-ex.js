const { ForbiddenException } = require('@nestjs/common');
const e = new ForbiddenException('My custom message');
console.log('e.response is:', e.response);
