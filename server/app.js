if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const {
  Student,
  Instructor,
  Category,
  Booking,
  Course,
  Schedule,
} = require('./models');

const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const express = require('express');

const app = express();

const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

//* Mapbox
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });

//* Multer
const multer = require('multer');
const { storage } = require('./cloudinary/index');
const upload = multer({ storage });

//? Register Student
app.post(
  '/student/register',
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.body.email) throw { name: 'Email is required' };
      if (!req.body.password) throw { name: 'Password is required' };
      if (!req.body.fullName) throw { name: 'Full Name is required' };
      if (!req.body.birthDate) throw { name: 'Birth Date is required' };
      if (!req.body.location) throw { name: 'Location is required' };

      const geoData = await geocoder
        .forwardGeocode({
          query: req.body.location,
          limit: 1,
        })
        .send();

      let input = {
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 10),
        fullName: req.body.fullName,
        bio: req.body.bio,
        role: 'student',
        birthDate: req.body.birthDate,
        phoneNumber: req.body.phoneNumber,
        profilePicture: req.body.profilePicture,
        location: req.body.location,
        geometry: geoData.body.features[0].geometry,
      };

      const student = await Student.create(input);
      res.status(201).json({ message: 'Success create a new student' });
    } catch (error) {
      next(error);
    }
  }
);

//? Login Student
app.post('/student/login', async (req, res, next) => {
  try {
    if (!req.body.email) throw { name: 'Email is required' };
    if (!req.body.password) throw { name: 'Password is required' };

    const student = await Student.findOne({
      where: {
        email: req.body.email,
      },
    });

    if (!student) throw { name: 'Invalid email or password' };

    const isPasswordValid = bcrypt.compareSync(
      req.body.password,
      student.password
    );

    if (!isPasswordValid) throw { name: 'Invalid email or password' };

    const access_token = jwt.sign({ id: student.id }, process.env.JWT_SECRET);

    res.status(200).json({
      access_token,
      location: student.geometry,
      role: student.role,
      email: student.email,
    });
  } catch (error) {
    next(error);
  }
});

//?-----------------------------------------------------------------------

//? Register Instructor
app.post(
  '/instructor/register',
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.body.email) throw { name: 'Email is required' };
      if (!req.body.password) throw { name: 'Password is required' };
      if (!req.body.fullName) throw { name: 'Full Name is required' };
      if (!req.body.birthDate) throw { name: 'Birth Date is required' };
      if (!req.body.location) throw { name: 'Location is required' };

      const geoData = await geocoder
        .forwardGeocode({
          query: req.body.location,
          limit: 1,
        })
        .send();

      let input = {
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 10),
        fullName: req.body.fullName,
        bio: req.body.bio,
        role: 'instructor',
        birthDate: req.body.birthDate,
        phoneNumber: req.body.phoneNumber,
        profilePicture: req.body.profilePicture,
        location: req.body.location,
        geometry: geoData.body.features[0].geometry,
      };

      const instructor = await Instructor.create(input);
      res.status(201).json({ message: 'Success create a new instructor!' });
    } catch (error) {
      next(error);
    }
  }
);

//? Login Student
app.post('/instructor/login', async (req, res, next) => {
  try {
    if (!req.body.email) throw { name: 'Email is required' };
    if (!req.body.password) throw { name: 'Password is required' };

    const instructor = await Instructor.findOne({
      where: {
        email: req.body.email,
      },
    });

    if (!instructor) throw { name: 'Invalid email or password' };

    const isPasswordValid = bcrypt.compareSync(
      req.body.password,
      instructor.password
    );

    if (!isPasswordValid) throw { name: 'Invalid email or password' };

    const access_token = jwt.sign(
      { id: instructor.id },
      process.env.JWT_SECRET
    );

    res.status(200).json({
      access_token,
      location: instructor.geometry,
      role: instructor.role,
      email: instructor.email,
    });
  } catch (error) {
    next(error);
  }
});

//? Get All Instructor
app.get('/instructor', async (req, res, next) => {
  try {
    const instructors = await Instructor.findAll({
      include: [
        {
          model: Schedule,
          Course,
          attributes: ['time'],
          include: [
            {
              model: Student,
              attributes: ['fullName', 'location'],
            },
          ],
        },
      ],
      attributes: [
        'id',
        'fullName',
        'bio',
        'profilePicture',
        'location',
        'phoneNumber',
      ],
    });
    res.status(200).json(instructors);
  } catch (error) {
    next(error);
  }
});

//! Error Handling
app.use((err, req, res, next) => {
  console.log(err);
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (
    err.name === 'SequelizeValidationError' ||
    err.name === 'SequelizeUniqueConstraintError'
  ) {
    statusCode = 400;
    message = err.errors[0].message;
  } else if (
    err.name === 'Email is required' ||
    err.name === 'Password is required' ||
    err.name === 'Full Name is required' ||
    err.name === 'Birth Date is required' ||
    err.name === 'Location is required'
  ) {
    statusCode = 400;
    message = err.name;
  } else if (err.name === 'Invalid email or password') {
    statusCode = 401;
    message = err.name;
  }

  res.status(statusCode).json({ message });
});

app.listen(port, () => {
  console.log(`My app listening on http://localhost:${port}`);
});
