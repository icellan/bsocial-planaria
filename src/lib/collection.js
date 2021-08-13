import { getDB } from './db';

/**
 * Collection class helper for working with mongodb
 * TODO: refactor this into separate package
 */
export class Collection {
  /**
   * Constructor
   *
   * @param collectionName
   * @param schema
   */
  constructor(collectionName, schema = false) {
    this.collectionName = collectionName;
    this.schema = schema;
    if (schema) {
      // add the default _id field to the schemas
      this.schema.extend({
        _id: { type: String },
      });
    }

    this._before = {};
    this._after = {};
  }

  /**
   * Find documents and return an iterator
   *
   * @param selector
   * @param options
   * @returns {Promise<*>}
   */
  async find(selector = {}, options = {}) {
    if (!this.db) this.db = await getDB();

    await this._runBeforeHook('find', selector, options);

    const result = await this.db.collection(this.collectionName)
      .find(selector, options);

    await this._runAfterHook('find', result);

    return result;
  }

  /**
   * Find exactly 1 document in mongodb and return as object
   *
   * @param selector
   * @param options
   * @returns {Promise<*>}
   */
  async findOne(selector = {}, options = {}) {
    if (!this.db) this.db = await getDB();

    await this._runBeforeHook('findOne', selector, options);

    const result = await this.db.collection(this.collectionName)
      .findOne(selector);

    await this._runAfterHook('findOne', result);

    return result;
  }

  /**
   * Update only 1 document in mongodb
   *
   * @param selector
   * @param modifier
   * @param options
   * @returns {Promise<*>}
   */
  async updateOne(selector, modifier, options = {}) {
    if (!this.db) this.db = await getDB();

    const cleanModifier = this._getCleanModifier(modifier);

    if (this._hasHook('updateOne')) {
      const doc = await this.findOne(selector)
        .catch((e) => { console.error(e); });

      await this._runBeforeHook('updateOne', doc, modifier, options);

      const result = await this.db.collection(this.collectionName)
        .updateOne(doc ? { _id: doc._id } : selector, cleanModifier, options);

      /* eslint-disable no-nested-ternary */
      const _id = (doc ? doc._id : (result.upsertedId ? result.upsertedId._id : null));

      if (this._hasAfterHook('updateOne')) {
        const updatedDoc = await this.findOne({ _id });
        await this._runAfterHook('updateOne', updatedDoc, modifier, options);
      }

      return result;
    }

    return this.db.collection(this.collectionName)
      .updateOne(selector, cleanModifier, options);
  }

  /**
   * Update many documents in mongodb
   *
   * @param selector
   * @param modifier
   * @param options
   * @returns {Promise<*>}
   */
  async updateMany(selector, modifier, options = {}) {
    if (!this.db) this.db = await getDB();

    if (options?.runHooks !== false) {
      await this._runBeforeHook('updateMany', selector, modifier, options);
    }

    const cleanModifier = this._getCleanModifier(modifier);
    const result = await this.db.collection(this.collectionName)
      .updateMany(selector, cleanModifier, options);

    if (options?.runHooks !== false) {
      await this._runAfterHook('updateMany', selector, modifier, options);
    }

    return result;
  }

  /**
   * Alias of updateMany
   *
   * @param selector
   * @param modifier
   * @param options
   * @returns {Promise<*>}
   */
  async update(selector, modifier, options = {}) {
    await this._runBeforeHook('update', selector, modifier, options);

    const result = await this.updateMany(
      selector,
      modifier,
      {
        ...options,
        runHooks: false,
      },
    );

    await this._runAfterHook('update', selector, modifier, options);

    return result;
  }

  /**
   * Upsert a document
   *
   * @param selector
   * @param modifier
   * @param options
   * @returns {Promise<*>}
   */
  async upsert(selector, modifier, options = {}) {
    options.upsert = true;

    await this._runBeforeHook('upsert', selector, modifier, options);

    const result = await this.updateMany(
      selector,
      modifier,
      {
        ...options,
        runHooks: false,
      },
    );

    await this._runAfterHook('upsert', selector, modifier, options);

    return result;
  }

  /**
   * Insert a single document into mongodb
   *
   * @param doc
   * @param options
   * @returns {Promise<*>}
   */
  async insert(doc, options = {}) {
    if (!this.db) this.db = await getDB();

    await this._runBeforeHook('insert', doc, options);

    const cleanedDoc = this._getCleanDoc(doc);

    if (!cleanedDoc.hasOwnProperty('_id')) {
      cleanedDoc._id = Random.id();
    }

    const result = await this.db.collection(this.collectionName)
      .insertOne(cleanedDoc, options);

    await this._runAfterHook('insert', cleanedDoc, options);

    return result;
  }

  async deleteOne(selector, options) {
    if (!this.db) this.db = await getDB();

    await this._runBeforeHook('deleteOne', selector, options);

    const result = await this.db.collection(this.collectionName)
      .deleteOne(selector, options);

    await this._runAfterHook('deleteOne', selector, options);

    return result;
  }

  async deleteMany(selector, options) {
    if (!this.db) this.db = await getDB();

    await this._runBeforeHook('deleteMany', selector, options);

    const result = await this.db.collection(this.collectionName)
      .deleteMany(selector, options);

    await this._runAfterHook('deleteMany', selector, options);

    return result;
  }

  /**
   * define hooks to call before a certain action is performed
   *
   * before('find', (selector, options) => {...} )
   * before('findOne', (selector, options) => {...} )
   * before('updateOne', (selector, modifier, options) => {...} )
   * before('updateMany', (selector, modifier, options) => {...} )
   * before('insert', (doc, options) => {...} )
   */
  before(action, callback) {
    if (!this._before[action]) this._before[action] = [];
    this._before[action].push(callback);
  }

  /**
   * define hooks to call after a certain action is performed
   *
   * after('find', (selector, options) => {...} )
   * after('findOne', (selector, options) => {...} )
   * after('updateOne', (selector, modifier, options) => {...} )
   * after('updateMany', (selector, modifier, options) => {...} )
   * after('insert', (doc, options) => {...} )
   *
   */
  after(action, callback) {
    if (!this._after[action]) this._after[action] = [];
    this._after[action].push(callback);
  }

  async _runBeforeHook(hook, selector, modifier, options) {
    if (this._hasBeforeHook(hook)) {
      for (let i = 0; i < this._before[hook].length; i++) {
        try {
          const callback = this._before[hook][i];
          await callback.call(this, selector, modifier, options)
            .catch((e) => {
              console.error(e);
            });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  async _runAfterHook(hook, selector, modifier, options) {
    if (this._hasAfterHook(hook)) {
      for (let i = 0; i < this._after[hook].length; i++) {
        try {
          const callback = this._after[hook][i];
          await callback.call(this, selector, modifier, options)
            .catch((e) => {
              console.error(e);
            });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  _hasHook(hook) {
    return this._before.hasOwnProperty(hook) || this._after.hasOwnProperty(hook);
  }

  _hasBeforeHook(hook) {
    return this._before.hasOwnProperty(hook);
  }

  _hasAfterHook(hook) {
    return this._after.hasOwnProperty(hook);
  }

  _getCleanModifier(modifier) {
    let cleanModifier = modifier;
    if (this.schema) {
      cleanModifier = this.schema.clean(modifier);
      const statusContext = this.schema.newContext();
      statusContext.validate(cleanModifier, { modifier: true });
      if (!statusContext.isValid()) {
        throw new Error(statusContext.validationErrors());
      }
    }

    return cleanModifier;
  }

  _getCleanDoc(doc) {
    let cleanDoc = doc;

    if (this.schema) {
      cleanDoc = this.schema.clean(doc);
    }

    return cleanDoc;
  }
}
