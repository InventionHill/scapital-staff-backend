const { ForbiddenException } = require('@nestjs/common');
let exception = new ForbiddenException('My custom err message');
const exceptionResponse = typeof exception.getResponse === 'function' ? exception.getResponse() : exception?.response;
console.log('Exception response:', exceptionResponse);
