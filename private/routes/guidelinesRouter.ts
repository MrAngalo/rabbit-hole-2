import express from "express";

export const guidelines:{ [k: string]: string } = {};

//temporary, might create file soon
guidelines['1'] = 'Be Respectful:';
guidelines['1.1'] = 'Treat all members with respect.';
guidelines['1.2'] = [
    'Do not engage in personal attacks, harassment, or',
    'discrimination based on race, ethnicity, gender, religion,',
    'sexual orientation, or any other personal characteristic.'
].join(" ");

guidelines['2'] = 'No Spamming or Flooding:';
guidelines['2.1'] = 'Avoid excessive or repetitive posting, including text and gifs.';
guidelines['2.2'] = 'Do not use automated bots or scripts to generate content.';

guidelines['3'] = 'No Inappropriate Content:';
guidelines['3.1'] = 'Content must be appropriate for an audience of 13 years old.';
guidelines['3.2'] = 'Use appropriate language and avoid profanity or vulgar terms.';

guidelines['4'] = 'No Controversial Topics';
guidelines['4.1'] = [
    'This includes but not limited to politics, race, religion, culture,',
    'gender, nationality, social status, or other topics that',
    'tend to evoke strong emotions or lead to heated debates.'
].join(" ");

guidelines['5'] = 'No Personal Information or Doxing';
guidelines['5.1'] = 'Do not share personal information about yourself or others.';
guidelines['5.2'] = [
    'This includes but not limited to names, addresses, phone numbers,',
    'emails, social media, or any information that could potentially',
    'identify an individual.'
].join(" ");

guidelines['6'] = 'No Advertising or Self-Promotion';
guidelines['6.1'] = [
    'Do not use the website for advertising purposes or to promote',
    'your own products, services, or social media accounts.'
].join(" ");

guidelines['7'] = 'Stay On Topic';
guidelines['7.1'] = 'Do not create scenarios that have no correlation with the topic.'
guidelines['7.2'] = 'Keep in mind the context of the previous scenarios when creating your own';

guidelines['8'] = 'Use Common Sense';
guidelines['8.1'] = 'This list is not final and cannot cover every possibility.'
guidelines['8.2'] = [
    'Staff has the final say on what to persist on the website. Any content that',
    'is deemed innapropriate by common sense will be removed. If you have questions',
    'to what is appropriate or not, please contact staff.'
].join(" ");

//guidelines hardcoded into this variable to avoid reading
//from file or database queries every time get request is called

export function guidelineRouter() {
    
    const router = express.Router();
    router.get('/guidelines', function(req, res) {
        res.render('guidelines', { g: guidelines });
    });
    return router;
}