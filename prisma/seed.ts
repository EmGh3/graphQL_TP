import { PrismaClient, Role } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Créer les utilisateurs
  const users = await prisma.user.createMany({
    data: [
      { name: "Alice Dupont", email: "alice@example.com", role: Role.ADMIN },
      { name: "Bob Martin", email: "bob@example.com", role: Role.USER },
      { name: "Charlie Brown", email: "charlie@example.com", role: Role.USER },
    ],
  });

  // Créer les compétences
  const skills = await prisma.skill.createMany({
    data: [
      { designation: "JavaScript" },
      { designation: "TypeScript" },
      { designation: "GraphQL" },
      { designation: "Node.js" },
      { designation: "React" },
    ],
  });

  // Récupérer les compétences et utilisateurs pour les relations
  const allSkills = await prisma.skill.findMany();
  const allUsers = await prisma.user.findMany();

  // Créer les CVs
  const cv1 = await prisma.cv.create({
    data: {
      name: "CV Alice",
      age: 30,
      job: "Développeuse Fullstack",
      userId: allUsers[0].id,
      skills: {
        connect: allSkills.filter(s => ["JavaScript", "TypeScript", "GraphQL"].includes(s.designation)).map(s => ({ id: s.id })),
      },
    },
  });

  const cv2 = await prisma.cv.create({
    data: {
      name: "CV Bob",
      age: 25,
      job: "Développeur Frontend",
      userId: allUsers[1].id,
      skills: {
        connect: allSkills.filter(s => ["JavaScript", "React"].includes(s.designation)).map(s => ({ id: s.id })),
      },
    },
  });

  const cv3 = await prisma.cv.create({
    data: {
      name: "CV Charlie",
      age: 35,
      job: "Développeur Backend",
      userId: allUsers[2].id,
      skills: {
        connect: allSkills.filter(s => ["TypeScript", "GraphQL", "Node.js"].includes(s.designation)).map(s => ({ id: s.id })),
      },
    },
  });

  console.log("Données insérées avec succès !");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
