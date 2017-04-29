import {Db, Collection, ObjectID} from 'mongodb'
import {Random} from '../utils/random'

export interface Challenge {
  _id?: ObjectID
  challengeid: string
  name: string
}

export class Challenges {

  public static Create(db: Db): Promise<Challenges> {
    return new Promise<Challenges>((resolve, reject) => {
      const challenges = new Challenges()
      db.collection('challenges', (err, collection) => {
        if (err) {
          return reject(err)
        }
        challenges._collection = collection
        resolve(challenges)
      })
    })
  }

  private _collection: Collection

  public removeAll(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteMany({}).then(() => {
        resolve()
      }).catch((err) => {
        reject(new Error('Could not remove all challenges: ' + err.message))
      })
    })
  }

  public removeByName(name: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteOne({ name: name }).then(() => {
        resolve()
      }).catch((err) => {
        reject(new Error('Could not remove challenge: ' + err.message))
      })
    })
  }

  public removeByChallengeId(challengeid: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteOne({ challengeid: challengeid }).then(() => {
        resolve()
      }).catch((err) => {
        reject(new Error('Could not remove challenge: ' + err.message))
      })
    })
  }

  public createRandomChallenge(prefix?: string): Challenge {
    prefix = prefix || ''
    const randomPart = Random.str(5)
    return {
      challengeid: `random-challenge-${prefix}${randomPart}`,
      name: `Random Challenge ${prefix}${randomPart}`,
    }
  }

  public insertChallenge(challenge: Challenge): Promise<ObjectID> {
    return new Promise<ObjectID>((resolve, reject) => {
      this._collection.insertOne(challenge).then(() => {
        resolve()
      }).catch((err) => {
        reject(new Error('Could not insert challenge: ' + err.message))
      })
    })
  }

  public insertRandomChallenge(prefix?: string): Promise<Challenge> {
    const randomChallenge = this.createRandomChallenge(prefix)
    return new Promise<Challenge>((resolve, reject) => {
      this._collection.insertOne(randomChallenge).then((result) => {
        randomChallenge._id = result.insertedId
        resolve(randomChallenge)
      }).catch((err) => {
        reject(new Error('Could not insert random challenge: ' + err.message))
      })
    })
  }

  public findbyName(name: string): Promise<Challenge> {
    return new Promise<Challenge>((resolve, reject) => {
      this._collection.find({ name: name }).limit(1).toArray().then((challenges: Challenge[]) => {
        resolve(challenges.length > 0 ? challenges[0] : null)
      }).catch((err) => {
        reject(new Error('Error when finding challenge: ' + err.message))
      })
    })
  }

  public findByChallengeId(challengeid: string): Promise<Challenge> {
    return new Promise<Challenge>((resolve, reject) => {
      this._collection.find({ challengeid: challengeid }).limit(1).toArray().then((challenges: Challenge[]) => {
        resolve(challenges.length > 0 ? challenges[0] : null)
      }).catch((err) => {
        reject(new Error('Error when finding challenge: ' + err.message))
      })
    })
  }
}
