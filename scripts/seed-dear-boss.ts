import { existsSync } from "node:fs";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import quiz from "../data/dear-boss.json";
import { validateQuestions } from "../lib/engine";

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId)
    throw new Error(
      "Set FIREBASE_PROJECT_ID and Firebase Admin credentials before seeding.",
    );
  const credential =
    process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
      ? cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        })
      : applicationDefault();
  const db = getFirestore(initializeApp({ projectId, credential }));
  const validated = { ...quiz, questions: validateQuestions(quiz.questions) };
  const ref = db.collection("quizpopQuizzes").doc(quiz.id);
  const force = process.argv.includes("--force");
  const result = await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists && !force)
      return "Already present; kept the existing quiz. Use --force to replace it.";
    tx.set(ref, {
      quiz: validated,
      updatedAt: Date.now(),
      updatedBy: "seed:dear-boss",
    });
    return "Saved " + validated.questions.length + " Dear Boss questions.";
  });
  console.log(result);
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
