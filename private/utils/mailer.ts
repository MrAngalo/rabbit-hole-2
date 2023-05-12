// const ejs = require('ejs');
// const mailer = require('nodemailer');


// enum EmailType {
//     VERIFICATION,
// }

// const transporter = mailer.createTransport({
//     host: "smtp.zoho.com",
//     port: 465,
//     secure: true,
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//     }
// });

// transporter.verify((error, success) => {
//     if (error) {
//         console.log(error);
//     } else {
//         console.log("successfully connected to mail server")
//     }
// });

// var myMailer:any = {};
// var 
// myMailer.sendEmail = async function(type:EmailType, email:string, ejsOptions:object) {
//     switch (type) {
//         case EmailType.VERIFICATION: {
//             const html = await ejs.renderFile(__dirname + 'views/emails/verify.ejs');

//             transporter.sendMail({
//                 from: `"Rabbit Search Game" <${process.env.EMAIL_USER}>`,
//                 to: email,
//                 subject: 'Verify your email',
//                 html: html
//             });
//             break;
//         }
//         default: {
//             throw Error(`Email type ${type} not supported!`);
//         }
//     }
// }

// module.exports = myMailer;