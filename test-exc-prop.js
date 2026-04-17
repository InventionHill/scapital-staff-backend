const { ForbiddenException } = require('@nestjs/common');
let exception = new ForbiddenException('My custom err message');
console.log('exception.response is:', exception.response);
