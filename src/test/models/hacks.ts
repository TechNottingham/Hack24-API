import { Db, Collection, ObjectID } from 'mongodb'
import { Random } from '../utils/random'

export interface Hack {
  _id?: ObjectID
  hackid: string
  name: string
  challenges: ObjectID[]
}

export class Hacks {

  public static Create(db: Db): Promise<Hacks> {
    return new Promise<Hacks>((resolve, reject) => {
      const hacks = new Hacks()
      db.collection('hacks', (err, collection) => {
        if (err) {
          return reject(err)
        }
        hacks._collection = collection
        resolve(hacks)
      })
    })
  }

  private _collection: Collection

  public removeAll(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteMany({}).then(() => {
        resolve()
      }).catch((err) => {
        reject(new Error('Could not remove all hacks: ' + err.message))
      })
    })
  }

  public removeByName(name: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteOne({ name: name }).then(() => {
        resolve()
      }).catch((err) => {
        reject(new Error('Could not remove hack: ' + err.message))
      })
    })
  }

  public removeByHackId(hackid: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteOne({ hackid: hackid }).then(() => {
        resolve()
      }).catch((err) => {
        reject(new Error('Could not remove hack: ' + err.message))
      })
    })
  }

  public createRandomHack(prefix?: string): Hack {
    prefix = prefix || ''
    const randomPart = Random.str(5)
    return {
      hackid: `random-hack-${prefix}${randomPart}`,
      name: `Random Hack ${prefix}${randomPart}`,
      challenges: [],
    }
  }

  public insertHack(hack: Hack): Promise<ObjectID> {
    return new Promise<ObjectID>((resolve, reject) => {
      this._collection.insertOne(hack).then(() => {
        resolve()
      }).catch((err) => {
        reject(new Error('Could not insert hack: ' + err.message))
      })
    })
  }

  public insertRandomHack(prefix?: string): Promise<Hack> {
    const randomHack = this.createRandomHack(prefix)
    return new Promise<Hack>((resolve, reject) => {
      this._collection.insertOne(randomHack).then((result) => {
        randomHack._id = result.insertedId
        resolve(randomHack)
      }).catch((err) => {
        reject(new Error('Could not insert random hack: ' + err.message))
      })
    })
  }

  public findbyName(name: string): Promise<Hack> {
    return new Promise<Hack>((resolve, reject) => {
      this._collection.find({ name: name }).limit(1).toArray().then((hacks: Hack[]) => {
        resolve(hacks.length > 0 ? hacks[0] : null)
      }).catch((err) => {
        reject(new Error('Error when finding hack: ' + err.message))
      })
    })
  }

  public findByHackId(hackid: string): Promise<Hack> {
    return new Promise<Hack>((resolve, reject) => {
      this._collection.find({ hackid: hackid }).limit(1).toArray().then((hacks: Hack[]) => {
        resolve(hacks.length > 0 ? hacks[0] : null)
      }).catch((err) => {
        reject(new Error('Error when finding hack: ' + err.message))
      })
    })
  }
}
