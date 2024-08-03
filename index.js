const puppeteer = require('puppeteer');
const schedule = require('node-schedule');
const nodemailer = require('nodemailer');

const {base_url, to_from, date, bus_id, seats, email, pass} = require('./data');
const url = `${base_url}/${to_from}/${date}/${bus_id}`;

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: email,
        pass,
    }
});

const sendNotification = (msg) => {
    const mailOptions = {
        from: email,
        to: 'recipient email',
        subject: 'The Seat is Empty!',
        text: msg,
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending email:', err);
        } else {
            console.log('Email sent!');
        }
    });
};

const checkSeats = async () => {
    const browser = await puppeteer.launch({headless: false, args: ['--start-maximized']});
    const page = await browser.newPage();

    await page.goto(url, {waitUntil: 'networkidle2'});
    await page.waitForSelector('.list');
    await page.waitForSelector('.journey');
    await page.waitForSelector('.available');

    const seatsInfo = await page.evaluate((seats) => {
        let avail = [];

        document.querySelectorAll('.available').forEach((el) => {
            const seatNumber = Number(el.textContent.trim());
            if (seats.includes(seatNumber)) {
                avail.push(seatNumber);
            }
        });

        return avail;
    }, seats);

    await browser.close();

    return seatsInfo;
};

schedule.scheduleJob('*/10 * * * *', async () => {
    try {
        const avail = await checkSeats();

        if (avail.length > 0) {
            sendNotification(`The seat(s) you were waiting for, number(s) ${avail.join(', ')} ${avail.length > 1 ? 'are' : 'is'} now available. Hurry up!`);
        } else {
            console.log('No seats available.');
        }
    } catch (e) {
        console.error('Error in scheduled job:', e);
    }
});
