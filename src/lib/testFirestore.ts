import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export async function testFirestoreConnection() {
  console.log("Starting Firestore test...");
  const user = auth.currentUser;
  if (!user) {
    console.log("No authenticated user, skipping Firestore test.");
    return;
  }

  const testUserRef = doc(db, 'users', user.uid);
  
  try {
    // 1. Write dummy user data
    await setDoc(testUserRef, {
      telegramId: user.uid,
      username: 'test_user',
      balance: 100,
      createdAt: new Date().toISOString()
    });
    console.log("Test: Create dummy user successful");

    // 2. Read user data
    const docSnap = await getDoc(testUserRef);
    if (docSnap.exists()) {
      console.log("Test: Read dummy user successful:", docSnap.data());
    } else {
      console.error("Test: Read dummy user failed");
    }

    // 3. Test Security (Update username - should succeed)
    await updateDoc(testUserRef, { username: 'updated_username' });
    console.log("Test: Update username successful (Security rule: Allowed)");

    // 4. Test Security (Update balance - should fail)
    try {
      await updateDoc(testUserRef, { balance: 200 });
      console.error("Test: Update balance failed (Security rule: SHOULD have failed but didn't)");
    } catch (e) {
      console.log("Test: Update balance failed as expected (Security rule: Blocked)");
    }

  } catch (e) {
    console.error("Test: Firestore operation failed", e);
  }
}
