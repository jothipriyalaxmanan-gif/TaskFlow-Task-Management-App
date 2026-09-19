const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'storage.json');

// Ensure data directory and storage.json file exist
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { users: [], tasks: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

ensureDataFile();

function readData() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading storage.json:', err.message);
    return { users: [], tasks: [] };
  }
}

function writeData(data) {
  try {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing storage.json:', err.message);
  }
}

function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

// Fallback User Model
class FallbackUser {
  constructor(data) {
    this._id = (data._id || generateObjectId()).toString();
    this.name = data.name;
    this.email = data.email ? data.email.toLowerCase().trim() : '';
    this.password = data.password;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  toJSON() {
    const obj = { ...this };
    delete obj.password;
    return obj;
  }

  async save() {
    const data = readData();
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    this.updatedAt = new Date();

    const idx = data.users.findIndex((u) => u._id === this._id);
    if (idx >= 0) {
      data.users[idx] = { ...this };
    } else {
      data.users.push({ ...this });
    }
    writeData(data);
    return this;
  }

  static async findOne(query) {
    const data = readData();
    let found = null;
    if (query.email) {
      const email = query.email.toLowerCase().trim();
      found = data.users.find((u) => u.email.toLowerCase() === email);
    } else if (query._id) {
      const idStr = query._id.toString();
      found = data.users.find((u) => u._id === idStr);
    }
    return found ? new FallbackUser(found) : null;
  }

  static findById(id) {
    const idStr = id ? id.toString() : '';
    const promise = FallbackUser.findOne({ _id: idStr });
    promise.select = async function (fields) {
      const user = await FallbackUser.findOne({ _id: idStr });
      if (user && fields && fields.includes('-password')) {
        delete user.password;
      }
      return user;
    };
    return promise;
  }
}

// Fallback Task Model
class FallbackTask {
  constructor(data) {
    this._id = (data._id || generateObjectId()).toString();
    this.user = data.user ? data.user.toString() : null;
    this.title = data.title;
    this.description = data.description || '';
    this.deadline = data.deadline ? new Date(data.deadline) : null;
    this.priority = data.priority || 'medium';
    this.status = data.status || 'pending';
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  async save() {
    const data = readData();
    this.updatedAt = new Date();
    const idx = data.tasks.findIndex((t) => t._id === this._id);
    if (idx >= 0) {
      data.tasks[idx] = { ...this };
    } else {
      data.tasks.push({ ...this });
    }
    writeData(data);
    return this;
  }

  static async findOne(query) {
    const data = readData();
    const found = data.tasks.find((t) => {
      if (query._id && t._id !== query._id.toString()) return false;
      if (query.user && t.user !== query.user.toString()) return false;
      return true;
    });
    return found ? new FallbackTask(found) : null;
  }

  static async findOneAndDelete(query) {
    const data = readData();
    const idx = data.tasks.findIndex((t) => {
      if (query._id && t._id !== query._id.toString()) return false;
      if (query.user && t.user !== query.user.toString()) return false;
      return true;
    });
    if (idx >= 0) {
      const deleted = data.tasks.splice(idx, 1)[0];
      writeData(data);
      return new FallbackTask(deleted);
    }
    return null;
  }

  static find(query) {
    const data = readData();
    let results = data.tasks.filter((t) => {
      if (query.user && t.user !== query.user.toString()) return false;
      if (query.status && t.status !== query.status) return false;
      if (query.priority && t.priority !== query.priority) return false;
      if (query.$or && Array.isArray(query.$or)) {
        const matchesOr = query.$or.some((orClause) => {
          if (orClause.title) {
            return orClause.title.test ? orClause.title.test(t.title) : t.title.toLowerCase().includes(String(orClause.title).toLowerCase());
          }
          if (orClause.description) {
            return orClause.description.test ? orClause.description.test(t.description) : t.description.toLowerCase().includes(String(orClause.description).toLowerCase());
          }
          return false;
        });
        if (!matchesOr) return false;
      }
      return true;
    });

    const taskInstances = results.map((r) => new FallbackTask(r));

    const queryResult = {
      _tasks: taskInstances,
      sort: function (sortOptions) {
        if (!sortOptions) return this;
        this._tasks.sort((a, b) => {
          if (sortOptions.createdAt !== undefined) {
            const valA = new Date(a.createdAt).getTime();
            const valB = new Date(b.createdAt).getTime();
            return sortOptions.createdAt === 1 ? valA - valB : valB - valA;
          }
          if (sortOptions.deadline !== undefined) {
            const valA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
            const valB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
            return sortOptions.deadline === 1 ? valA - valB : valB - valA;
          }
          if (sortOptions.priority !== undefined) {
            const weight = { high: 3, medium: 2, low: 1 };
            const valA = weight[a.priority] || 0;
            const valB = weight[b.priority] || 0;
            return sortOptions.priority === 1 ? valA - valB : valB - valA;
          }
          return 0;
        });
        return this;
      },
      then: function (resolve, reject) {
        try {
          resolve(this._tasks);
        } catch (err) {
          reject(err);
        }
      }
    };

    return queryResult;
  }
}

module.exports = {
  FallbackUser,
  FallbackTask,
  readData,
  writeData
};
