import { createPubSub } from "graphql-yoga";
import { db, Skill, User, Cv, CvEvent, CvWithRelations, shouldPublishEvent } from "./db";

const pubSub = createPubSub<{
  cvChanged: [CvEvent];
}>();

function getCvSkills(cvId: number): Skill[] {
  return db.cvSkills
    .filter(cvSkill => cvSkill.cvId === cvId)
    .map(cvSkill => db.skills.find(skill => skill.id === cvSkill.skillId))
    .filter((skill): skill is Skill => !!skill);
}

function getUser(userId: number): User | undefined {
  return db.users.find(user => user.id === userId);
}

export function prepareCv(cv: Cv): CvWithRelations {
  return {
    ...cv,
    skills: getCvSkills(cv.id),
    user: getUser(cv.userId),
  };
}

interface GraphQLContext {
  isSubscriptionUpdate?: boolean;
  subscriptionId?: string;
  isInitialConnection?: boolean;
}

export const resolvers = {
  Query: {
    getAllCvs: (): CvWithRelations[] => {
      return db.cvs.map(prepareCv);
    },
    getCv: (_: unknown, args: { id: number }): CvWithRelations => {
      const cv = db.cvs.find(cv => cv.id === args.id);
      if (!cv) throw new Error(`CV with ID ${args.id} not found`);
      return prepareCv(cv);
    }
  },
  Mutation: {
    createCv: (_: unknown, args: { input: Omit<Cv, 'id'> }, context: GraphQLContext): CvWithRelations => {
      const user = db.users.find(u => u.id === args.input.userId);
      if (!user) throw new Error('User not found');

      const invalidSkill = args.input.skillIds.find(skillId => 
        !db.skills.some(s => s.id === skillId)
      );
      if (invalidSkill) throw new Error(`Skill with ID ${invalidSkill} not found`);

      const newId = Math.max(0, ...db.cvs.map(cv => cv.id)) + 1;
      const newCv: Cv = {
        id: newId,
        ...args.input
      };

      db.cvs.push(newCv);
      args.input.skillIds.forEach(skillId => {
        db.cvSkills.push({ cvId: newId, skillId });
      });

      const result = prepareCv(newCv);
      if (!context.isSubscriptionUpdate && shouldPublishEvent(newId, 'CREATED', context.subscriptionId)) {
        console.log(`[Event] CREATED CV ${newId} (Origin: ${context.subscriptionId || 'direct'})`);
        pubSub.publish('cvChanged', { type: 'CREATED', cv: result });
      }
      
      return result;
    },
    updateCv: (_: unknown, args: { input: Partial<Cv> & { id: number } }, context: GraphQLContext): CvWithRelations => {
      const cvIndex = db.cvs.findIndex(cv => cv.id === args.input.id);
      if (cvIndex === -1) throw new Error('CV not found');

      const cv = db.cvs[cvIndex];
      let userId = cv.userId;

      if (args.input.userId !== undefined) {
        if (!db.users.some(u => u.id === args.input.userId)) {
          throw new Error('User not found');
        }
        userId = args.input.userId;
      }

      const updatedCv: Cv = {
        ...cv,
        name: args.input.name ?? cv.name,
        age: args.input.age ?? cv.age,
        job: args.input.job ?? cv.job,
        userId,
        skillIds: args.input.skillIds ?? cv.skillIds
      };

      db.cvs[cvIndex] = updatedCv;

      if (args.input.skillIds) {
        db.cvSkills = db.cvSkills.filter(cs => cs.cvId !== args.input.id);
        args.input.skillIds.forEach(skillId => {
          if (!db.skills.some(s => s.id === skillId)) {
            throw new Error(`Skill with ID ${skillId} not found`);
          }
          db.cvSkills.push({ cvId: args.input.id, skillId });
        });
      }

      const result = prepareCv(updatedCv);
      if (!context.isSubscriptionUpdate && shouldPublishEvent(args.input.id, 'UPDATED', context.subscriptionId)) {
        console.log(`[Event] UPDATED CV ${args.input.id} (Origin: ${context.subscriptionId || 'direct'})`);
        pubSub.publish('cvChanged', { type: 'UPDATED', cv: result });
      }
      
      return result;
    },
    deleteCv: (_: unknown, args: { id: number }, context: GraphQLContext): boolean => {
      const cvIndex = db.cvs.findIndex(cv => cv.id === args.id);
      if (cvIndex === -1) throw new Error('CV not found');

      const [deletedCv] = db.cvs.splice(cvIndex, 1);
      db.cvSkills = db.cvSkills.filter(cs => cs.cvId !== args.id);

      if (!context.isSubscriptionUpdate && shouldPublishEvent(args.id, 'DELETED', context.subscriptionId)) {
        console.log(`[Event] DELETED CV ${args.id} (Origin: ${context.subscriptionId || 'direct'})`);
        pubSub.publish('cvChanged', { 
          type: 'DELETED', 
          cv: prepareCv(deletedCv) 
        });
      }
      return true;
    }
  },
  Subscription: {
    cvChanged: {
      subscribe: (_, __, context) => {
        console.log(`[Sub] New listener ID: ${context.subscriptionId}`);
        return pubSub.subscribe('cvChanged');
      },
      resolve: (payload: CvEvent) => {
        console.log(`[Sub] Delivering ${payload.type} for CV ${payload.cv.id}`);
        return payload;
      }
    }
  }
};