import express from "express";

module.exports = guidelineRouter
export = guidelineRouter;

//guidelines hardcoded into this variable to avoid reading
//from file or database queries every time get request is called
const g:{ [k: string]: string } = {};

const router = express.Router();
function guidelineRouter() {
    router.get('/guidelines', function(req, res) {
        res.render('guidelines', { g });
    });
    return router;
}

//temporary, might create file soon
g['1'] = `Be Respectful:`;
g['1.1'] = `Treat all members with respect.`;
g['1.2'] = `Do not engage in personal attacks, harassment, or
            discrimination based on race, ethnicity, gender, religion,
            sexual orientation, or any other personal characteristic.`;

g['2'] = `No Spamming or Flooding:`;
g['2.1'] = `Avoid excessive or repetitive posting, including text and gifs.`;
g['2.2'] = `Do not use automated bots or scripts to generate content.`;

g['3'] = `No Inappropriate Content:`;
g['3.1'] = `Content must be appropriate for an audience of 13 years old.`;
g['3.2'] = `Use appropriate language and avoid profanity or vulgar terms.`;

g['4'] = `No Controversial Topics`;
g['4.1'] = `This includes but not limited to politics, race, religion, culture,
            gender, nationality, social status, or other topics that
            tend to evoke strong emotions or lead to heated debates.`;

g['5'] = `No Personal Information or Doxing`;
g['5.1'] = `Do not share personal information about yourself or others.`;
g['5.2'] = `This includes but not limited to names, addresses, phone numbers,
            emails, social media, or any information that could potentially
            identify an individual.`;

g['6'] = `No Advertising or Self-Promotion`;
g['6.1'] = `Do not use the website for advertising purposes or to promote
            your own products, services, or social media accounts.`;

g['7'] = `Stay On Topic`;
g['7.1'] = `Do not create scenarios that have no correlation with the topic.`
g['7.2'] = `Keep in mind the context of the previous scenarios when creating your own`;

g['8'] = `Use Common Sense`;
g['8.1'] = `This list is not final and cannot cover every possibility.`
g['8.2'] = `Staff has the final say on what to persist on the website. Any content that
            is deemed innapropriate by common sense will be removed. If you have questions
            to what is appropriate or not, please contact staff. `