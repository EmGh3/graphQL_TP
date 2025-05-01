export enum Role {
    ADMIN = "ADMIN",
    USER = "USER"
  }
  
  export interface User {
    id: number;
    name: string;
    email: string;
    role: Role;
  }
  
  export interface Skill {
    id: number;
    designation: string;
  }
  
  export interface Cv {
    id: number;
    name: string;
    age: number;
    job: string;
    userId: number;
    user?: User; 
    skillIds: number[];
    skills?: Skill[]; 
  }
  
  // Tables relationnelles (many-to-many)
  export interface CvSkill {
    cvId: number;
    skillId: number;
  }
  
  // Données fictives
  export const users: User[] = [
    { id: 1, name: "Alice Dupont", email: "alice@example.com", role: Role.ADMIN },
    { id: 2, name: "Bob Martin", email: "bob@example.com", role: Role.USER },
    { id: 3, name: "Charlie Brown", email: "charlie@example.com", role: Role.USER }
  ];
  
  export const skills: Skill[] = [
    { id: 1, designation: "JavaScript" },
    { id: 2, designation: "TypeScript" },
    { id: 3, designation: "GraphQL" },
    { id: 4, designation: "Node.js" },
    { id: 5, designation: "React" }
  ];
  
  export const cvs: Cv[] = [
    { id: 1, name: "CV Alice", age: 30, job: "Développeuse Fullstack", userId: 1, skillIds: [1, 2, 3] },
    { id: 2, name: "CV Bob", age: 25, job: "Développeur Frontend", userId: 2, skillIds: [1, 5] },
    { id: 3, name: "CV Charlie", age: 35, job: "Développeur Backend", userId: 3, skillIds: [2, 3, 4] }
  ];
  
  export const cvSkills: CvSkill[] = [
    { cvId: 1, skillId: 1 },
    { cvId: 1, skillId: 2 },
    { cvId: 1, skillId: 3 },
    { cvId: 2, skillId: 1 },
    { cvId: 2, skillId: 5 },
    { cvId: 3, skillId: 2 },
    { cvId: 3, skillId: 3 },
    { cvId: 3, skillId: 4 }
  ];
  
  // Contexte de la base de données
  export interface DbContext {
    users: User[];
    skills: Skill[];
    cvs: Cv[];
    cvSkills: CvSkill[];
  }
  
  export const db: DbContext = {
    users,
    skills,
    cvs,
    cvSkills
  };