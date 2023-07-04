import ejs from 'ejs';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
let sender: string;
let globals: any;

export async function initTransporter(options: SMTPTransport.Options, _globals:any) {
    transporter = nodemailer.createTransport(options);
    sender = options.auth?.user!;
    globals = _globals;

    return new Promise<boolean>((Resolve, Reject) => {
        transporter.verify((error, success) => {
            if (error) {
                console.log(error);
                Resolve(false);
            } else {
                Resolve(true);
            }
        });
    });
}

export function closeTransporter() {
    transporter.close();
}

export async function sendMail(email: string, subject: string, view: string, data:ejs.Data) {
    const html = await ejs.renderFile(`${globals.rootdir}/views/emails/${view}.ejs`, data);
    transporter.sendMail({
        from: `"Rabbit Search Game" <${sender}>`,
        to: email,
        subject,
        html
    });
}

export async function sendVerificationEmail(email: string, token: string) {
    let subject = 'Verify Your Email';
    let url = `${process.env.ABSOLUTE_URL}/login?token=${token}`;
    await sendMail(email, subject, 'verify', { token, subject, url });
}

export async function sendResetPasswordEmail(email: string, token: string) {
    let subject = 'Reset Your Password';
    let url = `${process.env.ABSOLUTE_URL}/pwnew?token=${token}`;
    await sendMail(email, subject, 'pwreset', { token, subject, url });
}