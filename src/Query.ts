import { db, Skill } from './db'

function getCvSkills(cvId: number) {
    const cvSkills = db.cvSkills.filter(cvSkill => cvSkill.cvId === cvId);
    return cvSkills.map(cvSkill => {
        const skill = db.skills.find(skill => skill.id === cvSkill.skillId);
        return skill;
    }).filter((skill): skill is Skill => skill !== null && skill !== undefined);
}
function getUser(userId: number) {
    return db.users.find(user => user.id === userId);
}

export const Query = {
    getAllCvs: () => {
        const cvs = db.cvs;
        cvs.forEach(cv => {
            cv.skills = getCvSkills(cv.id);
            cv.user = getUser(cv.userId);
        })
        return cvs;
    },
    getCv: (_: any, args: { id: number }) => { 
        const cv = db.cvs.find(cv => cv.id === args.id); 
        if (!cv) {
          throw new Error(`CV with ID ${args.id} not found`);
        }
        cv.skills = getCvSkills(cv.id);
        cv.user = getUser(cv.userId);
        return cv;
      }
}