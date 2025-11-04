const mongoose = require('mongoose');
// FIX 1: The path should match your file in the canvas: 'src/users.js'
const User = require('../src/models/User.js'); 

// !!! IMPORTANT: Replace this with your full connection string
const MONGO_URI = "mongodb+srv://ndrgyj_db_user:WlqHcqWTIt6jBMYB@teamup-db.texnweu.mongodb.net/teamup_db?appName=TeamUP-db";


// Test function
async function runTest() {
  let connection;
  try {
    // 1. Connect to the database
    connection = await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully! (to teamup_db)");

    // 2. (Optional) Clean up old test user
    // Now that we're on the correct DB, this will work.
    await User.deleteMany({ email: "202211575@stud.fci-cu.edu.eg" });
    console.log("Cleaned up old test users from teamup_db.");
    
    // 3. Create a new user (Student)
    console.log("Attempting to create a new student...");
    const testStudent = new User({
      // Mongoose handles the _id
      full_name: "Nada Mohammed",
      email: "2022@stud.fci-cu.edu.eg", // Email matching the 'Student' validation
      username: "nada_", // Must be unique
      password: "12455678900", // Will be hashed by the pre-save hook
      role: "Student",
      profile_id: null, // Allowed since it's optional
      googleId:"123456789"
    });

    // 4. Try to save the user to the database
    const savedUser = await testStudent.save();

    console.log("\n✅ --- SUCCESS! --- ✅");
    console.log("User created successfully:");
    console.log(savedUser);

  } catch (error) {
    // 5. If it fails, print the error (this means your validation is working!)
    console.error("\n❌ --- FAILED! --- ❌");
    console.error("Error creating user:", error.message);

  } finally {
    // 6. Disconnect from the database
    if (connection) {
      await mongoose.disconnect();
      console.log("\nMongoDB disconnected.");
    }
  }
}

// Run the test
runTest();