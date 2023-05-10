var validator = { validateRegistration }
module.exports = validator;
export = validator;

function validateRegistration(uname:string, email:string, rawPwd:string) {
    if (!String(email).toLowerCase().match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/))
      return `Email is not valid!`;

    if (uname.length < 3)
      return `Username must contain 3 characters!`;

    if (uname.match(/\s/))
      return `Username cannot contain spaces!`;

    if (!uname.match(/^[A-Za-z0-9_]+$/))
      return `Username must contain valid characters!`;

    if (rawPwd.length < 8)
      return `Password must contain 8 characters!`;

    if (rawPwd.match(/\s/))
      return `Password cannot contain spaces!`;

    if (!rawPwd.match(/^[A-Za-z0-9!@#$%^&*]+$/))
      return `Password must contain valid characters!`;

    // if (!rawPwd.match(/[A-Z]/g))
    //   return `Password must contain one uppercase letter`;

    if (!rawPwd.match(/[0-9]/g))
      return `Password must contain one number`;
    
    // if (!rawPwd.match(/[!@#$%^&*]/g))
    //   return `Password must contain one special character`;

    return null;
  }
