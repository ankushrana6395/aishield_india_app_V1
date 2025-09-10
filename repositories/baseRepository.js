/**
 * Base Repository Pattern - Enterprise Data Access Abstraction
 *
 * Provides a consistent interface for data operations across all entities
 */

const mongoose = require('mongoose');
const Logger = require('../utils/logger');
const { AggregateError, DatabaseError } = require('../utils/errorHandler');

/**
 * Base Repository Class
 * Implements common CRUD operations and advanced querying
 */
class BaseRepository {
  constructor(model) {
    this.model = model;
    this.defaultLimit = 20;
    this.maxLimit = 100;
  }

  /**
   * Find by ID with optional population
   * @param {String} id - Document ID
   * @param {Object} options - Query options
   * @returns {Object} Document
   */
  async findById(id, options = {}) {
    const startTime = Date.now();

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid ObjectId format');
      }

      const query = this.model.findById(id);

      // Apply population
      this._applyPopulation(query, options.populate);

      // Apply field selection
      if (options.fields) {
        query.select(options.fields);
      }

      const result = await query.exec();

      Logger.databaseLogger('findById', this.model.modelName, Date.now() - startTime, !!result);
      return result;

    } catch (error) {
      Logger.databaseLogger('findById', this.model.modelName, Date.now() - startTime, false);
      throw new DatabaseError(`Failed to find ${this.model.modelName}: ${error.message}`, error);
    }
  }

  /**
   * Find one document matching criteria
   * @param {Object} criteria - Query criteria
   * @param {Object} options - Query options
   * @returns {Object} Document
   */
  async findOne(criteria = {}, options = {}) {
    const startTime = Date.now();

    try {
      const query = this.model.findOne(criteria);

      // Apply population
      this._applyPopulation(query, options.populate);

      // Apply field selection
      if (options.fields) {
        query.select(options.fields);
      }

      // Apply sorting
      if (options.sort) {
        query.sort(options.sort);
      }

      // Apply lean option
      if (options.lean) {
        query.lean();
      }

      const result = await query.exec();

      Logger.databaseLogger('findOne', this.model.modelName, Date.now() - startTime, !!result);
      return result;

    } catch (error) {
      Logger.databaseLogger('findOne', this.model.modelName, Date.now() - startTime, false);
      throw new DatabaseError(`Failed to find ${this.model.modelName}: ${error.message}`, error);
    }
  }

  /**
   * Find documents with enterprise-grade pagination and filtering
   * @param {Object} criteria - Query criteria
   * @param {Object} options - Query options
   * @returns {Object} Paginated results
   */
  async find(criteria = {}, options = {}) {
    const startTime = Date.now();

    try {
      const {
        page = 1,
        limit = this.defaultLimit,
        sort = null,
        populate = null,
        fields = null,
        lean = false
      } = options;

      // Validate and sanitize pagination
      const sanitizedPage = Math.max(1, parseInt(page));
      const sanitizedLimit = Math.min(this.maxLimit, Math.max(1, parseInt(limit))) || this.defaultLimit;

      // Build query
      let query = this.model.find(criteria);

      // Apply field selection
      if (fields) {
        query = query.select(fields);
      }

      // Apply sorting
      if (sort) {
        query = query.sort(sort);
      }

      // Apply population
      this._applyPopulation(query, populate);

      // Apply pagination
      const skip = (sanitizedPage - 1) * sanitizedLimit;
      query = query.skip(skip).limit(sanitizedLimit);

      // Apply lean option
      if (lean) {
        query = query.lean();
      }

      // Get total count
      const totalQuery = this.model.countDocuments(criteria);
      const [documents, total] = await Promise.all([query.exec(), totalQuery.exec()]);

      const results = {
        documents,
        pagination: {
          page: sanitizedPage,
          limit: sanitizedLimit,
          total,
          pages: Math.ceil(total / sanitizedLimit),
          hasNext: sanitizedPage * sanitizedLimit < total,
          hasPrev: sanitizedPage > 1
        },
        timestamp: new Date().toISOString()
      };

      Logger.databaseLogger(
        'find_paginated',
        this.model.modelName,
        Date.now() - startTime,
        true
      );

      return results;

    } catch (error) {
      Logger.databaseLogger('find', this.model.modelName, Date.now() - startTime, false);
      throw new DatabaseError(`Failed to find ${this.model.modelName}s: ${error.message}`, error);
    }
  }

  /**
   * Create new document
   * @param {Object} data - Document data
   * @returns {Object} Created document
   */
  async create(data, options = {}) {
    const startTime = Date.now();

    try {
      const document = new this.model(data);
      const result = await document.save();

      // Apply population if requested
      if (options.populate) {
        await result.populate(options.populate).execPopulate();
      }

      Logger.databaseLogger('create', this.model.modelName, Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('create', this.model.modelName, Date.now() - startTime, false);

      if (error.code === 11000) {
        throw new Error('Duplicate entry: Document with this data already exists');
      }

      throw new DatabaseError(`Failed to create ${this.model.modelName}: ${error.message}`, error);
    }
  }

  /**
   * Update document by ID
   * @param {String} id - Document ID
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Object} Updated document
   */
  async updateById(id, data, options = {}) {
    const startTime = Date.now();

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid ObjectId format');
      }

      const updateOptions = {
        new: true,
        runValidators: true,
        ...options
      };

      // Apply population to findOneAndUpdate
      let query = this.model.findByIdAndUpdate(id, data, updateOptions);

      if (options.populate) {
        this._applyPopulation(query, options.populate);
      }

      const result = await query.exec();

      if (!result) {
        throw new Error('Document not found');
      }

      Logger.databaseLogger('updateById', this.model.modelName, Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('updateById', this.model.modelName, Date.now() - startTime, false);
      throw new DatabaseError(`Failed to update ${this.model.modelName}: ${error.message}`, error);
    }
  }

  /**
   * Delete document by ID
   * @param {String} id - Document ID
   * @returns {Boolean} Success status
   */
  async deleteById(id) {
    const startTime = Date.now();

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid ObjectId format');
      }

      const result = await this.model.findByIdAndDelete(id);

      const success = !!result;
      Logger.databaseLogger('deleteById', this.model.modelName, Date.now() - startTime, success);

      if (!success) {
        throw new Error('Document not found');
      }

      return success;

    } catch (error) {
      Logger.databaseLogger('deleteById', this.model.modelName, Date.now() - startTime, false);
      throw new DatabaseError(`Failed to delete ${this.model.modelName}: ${error.message}`, error);
    }
  }

  /**
   * Count documents matching criteria
   * @param {Object} criteria - Query criteria
   * @returns {Number} Document count
   */
  async count(criteria = {}) {
    const startTime = Date.now();

    try {
      const result = await this.model.countDocuments(criteria);

      Logger.databaseLogger('count', this.model.modelName, Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('count', this.model.modelName, Date.now() - startTime, false);
      throw new DatabaseError(`Failed to count ${this.model.modelName}s: ${error.message}`, error);
    }
  }

  /**
   * Check if document exists
   * @param {Object} criteria - Query criteria
   * @returns {Boolean} Existence status
   */
  async exists(criteria) {
    const startTime = Date.now();

    try {
      const result = await this.model.exists(criteria);

      Logger.databaseLogger('exists', this.model.modelName, Date.now() - startTime, true);
      return !!result;

    } catch (error) {
      Logger.databaseLogger('exists', this.model.modelName, Date.now() - startTime, false);
      throw new DatabaseError(`Failed to check ${this.model.modelName} existence: ${error.message}`, error);
    }
  }

  /**
   * Execute complex aggregation pipeline
   * @param {Array} pipeline - MongoDB aggregation pipeline
   * @param {Object} options - Aggregation options
   * @returns {Array} Aggregation results
   */
  async aggregate(pipeline, options = {}) {
    const startTime = Date.now();

    try {
      const result = await this.model.aggregate(pipeline, options);

      Logger.databaseLogger('aggregate', this.model.modelName, Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('aggregate', this.model.modelName, Date.now() - startTime, false);
      throw new DatabaseError(`Failed to aggregate ${this.model.modelName}s: ${error.message}`, error);
    }
  }

  /**
   * Bulk operations support
   * @param {Array} operations - Bulk operations array
   * @param {Object} options - Bulk options
   * @returns {Object} Bulk operation result
   */
  async bulkWrite(operations, options = {}) {
    const startTime = Date.now();

    try {
      const result = await this.model.bulkWrite(operations, options);

      Logger.databaseLogger('bulkWrite', this.model.modelName, Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('bulkWrite', this.model.modelName, Date.now() - startTime, false);
      throw new DatabaseError(`Failed to bulk write ${this.model.modelName}s: ${error.message}`, error);
    }
  }

  // Private helper methods

  _applyPopulation(query, populate) {
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(pop => {
          if (typeof pop === 'string') {
            query = query.populate(pop);
          } else if (pop.path && pop.select) {
            query = query.populate(pop.path, pop.select, pop.model, pop.match, pop.options);
          } else if (typeof pop === 'object') {
            query = query.populate(pop);
          }
        });
      } else if (typeof populate === 'string') {
        query = query.populate(populate);
      } else if (typeof populate === 'object') {
        query = query.populate(populate);
      }
    }

    return query;
  }

  /**
   * Get model indexes
   * @returns {Array} Model indexes
   */
  async getIndexes() {
    try {
      return await this.model.collection.getIndexes();
    } catch (error) {
      Logger.error(`Failed to get indexes for ${this.model.modelName}`, { error: error.message });
      return {};
    }
  }

  /**
   * Rebuild indexes
   * @returns {Object} Reindex result
   */
  async reindex() {
    try {
      return await this.model.collection.reIndex();
    } catch (error) {
      Logger.error(`Failed to reindex ${this.model.modelName}`, { error: error.message });
      throw new DatabaseError(`Failed to reindex ${this.model.modelName}: ${error.message}`, error);
    }
  }
}

module.exports = BaseRepository;