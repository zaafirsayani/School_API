import express from 'express';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { connectToDatabase, getDb } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'School API - MongoDB Edition',
    version: '1.0.0',
    endpoints: {
      teachers: '/teachers',
      courses: '/courses',
      students: '/students',
      tests: '/tests'
    }
  });
});

// ==================== TEACHERS ROUTES ====================

// GET all teachers
app.get('/teachers', async (req, res) => {
  try {
    const db = getDb();
    const test = await db.listCollections({}, {nameOnly: true}).toArray();
    console.log(test.map(c=>c.name))
    // console.log(db);
    // console.log(db.collection('teachers'));
    const teachers = await db.collection('steve').find({}).toArray();
    console.log(teachers)
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers', details: error.message });
  }
});

// GET single teacher by _id
app.get('/teachers/:id', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    const teacher = await db.collection('teachers').findOne({ _id });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teacher', details: error.message });
  }
});

// POST create new teacher
app.post('/teachers', async (req, res) => {
  try {
    const db = getDb();
    const { firstName, lastName, email, department, room } = req.body;
    
    if (!firstName || !lastName || !email || !department) {
      return res.status(400).json({ 
        error: 'Missing required fields: firstName, lastName, email, department' 
      });
    }
    
    const newTeacher = {
      firstName,
      lastName,
      email,
      department,
      room: room || ''
    };
    
    const result = await db.collection('teachers').insertOne(newTeacher);
    const createdTeacher = await db.collection('teachers').findOne({ _id: result.insertedId });
    res.status(201).json(createdTeacher);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create teacher', details: error.message });
  }
});

// PUT update teacher
app.put('/teachers/:id', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    const { firstName, lastName, email, department, room } = req.body;
    
    const existingTeacher = await db.collection('teachers').findOne({ _id });
    if (!existingTeacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    if (!firstName && !lastName && !email && !department && !room) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (email) updateFields.email = email;
    if (department) updateFields.department = department;
    if (room !== undefined) updateFields.room = room;
    
    await db.collection('teachers').updateOne({ _id }, { $set: updateFields });
    const updatedTeacher = await db.collection('teachers').findOne({ _id });
    res.json(updatedTeacher);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update teacher', details: error.message });
  }
});

// DELETE teacher
app.delete('/teachers/:id', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    
    const teacher = await db.collection('teachers').findOne({ _id });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    const coursesWithTeacher = await db.collection('courses').findOne({ teacherId: _id });
    if (coursesWithTeacher) {
      return res.status(400).json({ 
        error: 'Cannot delete teacher. Teacher is assigned to one or more courses.' 
      });
    }
    
    await db.collection('teachers').deleteOne({ _id });
    res.json({ message: 'Teacher deleted successfully', teacher });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete teacher', details: error.message });
  }
});

// ==================== COURSES ROUTES ====================

// GET all courses
app.get('/courses', async (req, res) => {
  try {
    const db = getDb();
    const courses = await db.collection('courses').find({}).toArray();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses', details: error.message });
  }
});

// GET single course by _id
app.get('/courses/:id', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    const course = await db.collection('courses').findOne({ _id });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course', details: error.message });
  }
});

// GET all tests for a course
app.get('/courses/:id/tests', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    const course = await db.collection('courses').findOne({ _id });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    const tests = await db.collection('tests').find({ courseId: _id }).toArray();
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tests', details: error.message });
  }
});

// GET class average for a course
app.get('/courses/:id/average', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    const course = await db.collection('courses').findOne({ _id });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const tests = await db.collection('tests').find({ courseId: _id }).toArray();
    if (tests.length === 0) {
      return res.json({ 
        courseId: _id, 
        courseName: course.name,
        average: null,
        message: 'No tests found for this course' 
      });
    }
    
    const totalPercentage = tests.reduce((sum, test) => {
      return sum + (test.mark / test.outOf * 100);
    }, 0);
    const average = totalPercentage / tests.length;
    
    res.json({ 
      courseId: _id,
      courseName: course.name,
      average: parseFloat(average.toFixed(2)),
      testCount: tests.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate average', details: error.message });
  }
});

// POST create new course
app.post('/courses', async (req, res) => {
  try {
    const db = getDb();
    const { code, name, teacherId, semester, room, schedule } = req.body;
    
    if (!code || !name || !teacherId || !semester || !room) {
      return res.status(400).json({ 
        error: 'Missing required fields: code, name, teacherId, semester, room' 
      });
    }
    
    const teacherObjectId = new ObjectId(teacherId);
    const teacher = await db.collection('teachers').findOne({ _id: teacherObjectId });
    if (!teacher) {
      return res.status(400).json({ error: 'Invalid teacherId. Teacher does not exist.' });
    }
    
    const newCourse = {
      code,
      name,
      teacherId: teacherObjectId,
      semester,
      room,
      schedule: schedule || ''
    };
    
    const result = await db.collection('courses').insertOne(newCourse);
    const createdCourse = await db.collection('courses').findOne({ _id: result.insertedId });
    res.status(201).json(createdCourse);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create course', details: error.message });
  }
});

// PUT update course
app.put('/courses/:id', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    const { code, name, teacherId, semester, room, schedule } = req.body;
    
    const existingCourse = await db.collection('courses').findOne({ _id });
    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    if (!code && !name && !teacherId && !semester && !room && !schedule) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    const updateFields = {};
    if (code) updateFields.code = code;
    if (name) updateFields.name = name;
    if (semester) updateFields.semester = semester;
    if (room) updateFields.room = room;
    if (schedule !== undefined) updateFields.schedule = schedule;
    
    if (teacherId) {
      const teacherObjectId = new ObjectId(teacherId);
      const teacher = await db.collection('teachers').findOne({ _id: teacherObjectId });
      if (!teacher) {
        return res.status(400).json({ error: 'Invalid teacherId. Teacher does not exist.' });
      }
      updateFields.teacherId = teacherObjectId;
    }
    
    await db.collection('courses').updateOne({ _id }, { $set: updateFields });
    const updatedCourse = await db.collection('courses').findOne({ _id });
    res.json(updatedCourse);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update course', details: error.message });
  }
});

// DELETE course
app.delete('/courses/:id', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    
    const course = await db.collection('courses').findOne({ _id });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const testsForCourse = await db.collection('tests').findOne({ courseId: _id });
    if (testsForCourse) {
      return res.status(400).json({ 
        error: 'Cannot delete course. Tests exist for this course.' 
      });
    }
    
    await db.collection('courses').deleteOne({ _id });
    res.json({ message: 'Course deleted successfully', course });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course', details: error.message });
  }
});

// ==================== STUDENTS ROUTES ====================

// GET all students
app.get('/students', async (req, res) => {
  try {
    const db = getDb();
    const students = await db.collection('students').find({}).toArray();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students', details: error.message });
  }
});

// GET single student by _id
app.get('/students/:id', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    const student = await db.collection('students').findOne({ _id });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student', details: error.message });
  }
});

// GET all tests for a student
app.get('/students/:id/tests', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    const student = await db.collection('students').findOne({ _id });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const tests = await db.collection('tests').find({ studentId: _id }).toArray();
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tests', details: error.message });
  }
});

// GET student average
app.get('/students/:id/average', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    const student = await db.collection('students').findOne({ _id });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const tests = await db.collection('tests').find({ studentId: _id }).toArray();
    if (tests.length === 0) {
      return res.json({ 
        studentId: _id, 
        studentName: `${student.firstName} ${student.lastName}`,
        average: null,
        message: 'No tests found for this student' 
      });
    }
    
    const totalPercentage = tests.reduce((sum, test) => {
      return sum + (test.mark / test.outOf * 100);
    }, 0);
    const average = totalPercentage / tests.length;
    
    res.json({ 
      studentId: _id,
      studentName: `${student.firstName} ${student.lastName}`,
      average: parseFloat(average.toFixed(2)),
      testCount: tests.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate average', details: error.message });
  }
});

// POST create new student
app.post('/students', async (req, res) => {
  try {
    const db = getDb();
    const { firstName, lastName, grade, studentNumber, homeroom } = req.body;
    
    if (!firstName || !lastName || !grade || !studentNumber) {
      return res.status(400).json({ 
        error: 'Missing required fields: firstName, lastName, grade, studentNumber' 
      });
    }
    
    const newStudent = {
      firstName,
      lastName,
      grade,
      studentNumber,
      homeroom: homeroom || ''
    };
    
    const result = await db.collection('students').insertOne(newStudent);
    const createdStudent = await db.collection('students').findOne({ _id: result.insertedId });
    res.status(201).json(createdStudent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create student', details: error.message });
  }
});

// PUT update student
app.put('/students/:id', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    const { firstName, lastName, grade, studentNumber, homeroom } = req.body;
    
    const existingStudent = await db.collection('students').findOne({ _id });
    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    if (!firstName && !lastName && !grade && !studentNumber && !homeroom) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (grade) updateFields.grade = grade;
    if (studentNumber) updateFields.studentNumber = studentNumber;
    if (homeroom !== undefined) updateFields.homeroom = homeroom;
    
    await db.collection('students').updateOne({ _id }, { $set: updateFields });
    const updatedStudent = await db.collection('students').findOne({ _id });
    res.json(updatedStudent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update student', details: error.message });
  }
});

// DELETE student
app.delete('/students/:id', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    
    const student = await db.collection('students').findOne({ _id });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const testsForStudent = await db.collection('tests').findOne({ studentId: _id });
    if (testsForStudent) {
      return res.status(400).json({ 
        error: 'Cannot delete student. Test records exist for this student.' 
      });
    }
    
    await db.collection('students').deleteOne({ _id });
    res.json({ message: 'Student deleted successfully', student });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student', details: error.message });
  }
});

// ==================== TESTS ROUTES ====================

// GET all tests
app.get('/tests', async (req, res) => {
  try {
    const db = getDb();
    const tests = await db.collection('tests').find({}).toArray();
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tests', details: error.message });
  }
});

// GET single test by _id
app.get('/tests/:id', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    const test = await db.collection('tests').findOne({ _id });
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test', details: error.message });
  }
});

// POST create new test
app.post('/tests', async (req, res) => {
  try {
    const db = getDb();
    const { studentId, courseId, testName, date, mark, outOf, weight } = req.body;
    
    if (!studentId || !courseId || !testName || !date || mark === undefined || !outOf) {
      return res.status(400).json({ 
        error: 'Missing required fields: studentId, courseId, testName, date, mark, outOf' 
      });
    }
    
    const studentObjectId = new ObjectId(studentId);
    const student = await db.collection('students').findOne({ _id: studentObjectId });
    if (!student) {
      return res.status(400).json({ error: 'Invalid studentId. Student does not exist.' });
    }
    
    const courseObjectId = new ObjectId(courseId);
    const course = await db.collection('courses').findOne({ _id: courseObjectId });
    if (!course) {
      return res.status(400).json({ error: 'Invalid courseId. Course does not exist.' });
    }
    
    const newTest = {
      studentId: studentObjectId,
      courseId: courseObjectId,
      testName,
      date,
      mark,
      outOf,
      weight: weight || 0
    };
    
    const result = await db.collection('tests').insertOne(newTest);
    const createdTest = await db.collection('tests').findOne({ _id: result.insertedId });
    res.status(201).json(createdTest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create test', details: error.message });
  }
});

// PUT update test
app.put('/tests/:id', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    const { studentId, courseId, testName, date, mark, outOf, weight } = req.body;
    
    const existingTest = await db.collection('tests').findOne({ _id });
    if (!existingTest) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    if (!studentId && !courseId && !testName && !date && mark === undefined && !outOf && weight === undefined) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    const updateFields = {};
    if (testName) updateFields.testName = testName;
    if (date) updateFields.date = date;
    if (mark !== undefined) updateFields.mark = mark;
    if (outOf) updateFields.outOf = outOf;
    if (weight !== undefined) updateFields.weight = weight;
    
    if (studentId) {
      const studentObjectId = new ObjectId(studentId);
      const student = await db.collection('students').findOne({ _id: studentObjectId });
      if (!student) {
        return res.status(400).json({ error: 'Invalid studentId. Student does not exist.' });
      }
      updateFields.studentId = studentObjectId;
    }
    
    if (courseId) {
      const courseObjectId = new ObjectId(courseId);
      const course = await db.collection('courses').findOne({ _id: courseObjectId });
      if (!course) {
        return res.status(400).json({ error: 'Invalid courseId. Course does not exist.' });
      }
      updateFields.courseId = courseObjectId;
    }
    
    await db.collection('tests').updateOne({ _id }, { $set: updateFields });
    const updatedTest = await db.collection('tests').findOne({ _id });
    res.json(updatedTest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update test', details: error.message });
  }
});

// DELETE test
app.delete('/tests/:id', async (req, res) => {
  try {
    const db = getDb();
    const _id = new ObjectId(req.params.id);
    
    const test = await db.collection('tests').findOne({ _id });
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    await db.collection('tests').deleteOne({ _id });
    res.json({ message: 'Test deleted successfully', test });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test', details: error.message });
  }
});

// ==================== 404 & ERROR HANDLERS ====================

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// ==================== START SERVER ====================

async function startServer() {
  try {
    await connectToDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 School API is ready to accept requests`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();