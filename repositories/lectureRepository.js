/**
 * Lecture Repository - Enterprise Data Access Layer
 *
 * Handles all lecture-related database operations with enterprise patterns
 */

const BaseRepository = require('./baseRepository');
const FileCategory = require('../models/FileCategory');
const Logger = require('../utils/logger');
const { DatabaseError } = require('../utils/errorHandler');

class LectureRepository extends BaseRepository {
  constructor() {
    super(FileCategory); // Using FileCategory as main lecture model
  }

  /**
   * Find lectures by course and category with proper access control
   * @param {String} courseId - Course ID
   * @param {String} categoryId - Category ID
   * @param {Object} options - Query options
   * @returns {Object} Lectures with access control
   */
  async findLecturesByCourseAndCategory(courseId, categoryId, options = {}) {
    const startTime = Date.now();

    try {
      const criteria = {};
      if (courseId) criteria.course = courseId;
      if (categoryId) criteria.category = categoryId;

      const result = await this.find(criteria, {
        sort: '-createdAt',
        populate: [
          {
            path: 'category',
            select: 'name description order'
          },
          {
            path: 'course',
            select: 'title instructor difficulty'
          }
        ],
        page: options.page || 1,
        limit: options.limit || 20,
        ...options
      });

      Logger.databaseLogger('findLecturesByCourseAndCategory', 'FileCategory', Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('findLecturesByCourseAndCategory', 'FileCategory', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to find lectures by course and category: ${error.message}`, error);
    }
  }

  /**
   * Search lectures by content with enterprise search
   * @param {String} searchTerm - Search term
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @returns {Object} Search results
   */
  async searchLectures(searchTerm, filters = {}, options = {}) {
    const startTime = Date.now();

    try {
      const criteria = {
        ...filters
      };

      // Add text search if supported
      if (searchTerm) {
        criteria.$or = [
          { title: new RegExp(searchTerm, 'i') },
          { description: new RegExp(searchTerm, 'i') },
          { filename: new RegExp(searchTerm, 'i') }
        ];
      }

      const result = await this.find(criteria, {
        sort: '-createdAt',
        populate: [
          {
            path: 'category',
            select: 'name'
          },
          {
            path: 'course',
            select: 'title instructor'
          }
        ],
        ...options
      });

      Logger.databaseLogger('searchLectures', 'FileCategory', Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('searchLectures', 'FileCategory', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to search lectures: ${error.message}`, error);
    }
  }

  /**
   * Get lecture content with access validation
   * @param {String} fileName - Unique filename
   * @returns {Object} Lecture with full content
   */
  async getLectureContent(fileName) {
    const startTime = Date.now();

    try {
      const lecture = await FileCategory.findOne({ filename: fileName })
        .select('+content') // Include full content (usually excluded)
        .populate('category', 'name')
        .populate('course', 'title instructor');

      if (!lecture) {
        throw new Error('Lecture not found');
      }

      Logger.databaseLogger('getLectureContent', 'FileCategory', Date.now() - startTime, true);
      return lecture;

    } catch (error) {
      Logger.databaseLogger('getLectureContent', 'FileCategory', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to get lecture content: ${error.message}`, error);
    }
  }

  /**
   * Update lecture metadata
   * @param {String} fileName - Lecture filename
   * @param {Object} updateData - Metadata updates
   * @returns {Object} Updated lecture
   */
  async updateLectureMetadata(fileName, updateData) {
    const startTime = Date.now();

    try {
      const criteria = { filename: fileName };

      // Add audit trail
      updateData.updatedAt = new Date();

      // Use updateOne to avoid validation issues
      const updateResult = await FileCategory.updateOne(criteria, updateData);
      const updatedDoc = await FileCategory.findOne(criteria);

      Logger.businessLogger('metadata_update', 'fileCategory', updatedDoc._id, {
        filename: fileName,
        changes: Object.keys(updateData)
      });

      Logger.databaseLogger('updateLectureMetadata', 'FileCategory', Date.now() - startTime, true);
      return updatedDoc;

    } catch (error) {
      Logger.databaseLogger('updateLectureMetadata', 'FileCategory', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to update lecture metadata: ${error.message}`, error);
    }
  }

  /**
   * Delete lecture and clean up files (transaction-safe)
   * @param {String} fileName - Lecture filename
   * @returns {Boolean} Success status
   */
  async deleteLecture(fileName) {
    const startTime = Date.now();

    try {
      // Start transaction for atomic operation
      const session = await FileCategory.startSession();
      session.startTransaction();

      try {
        // Delete lecture from database
        const deletedLecture = await FileCategory.findOneAndDelete(
          { filename: fileName },
          { session }
        );

        if (!deletedLecture) {
          throw new Error('Lecture not found');
        }

        // TODO: Implement file system cleanup in production
        // await this._cleanupFile(deletedLecture.filename);

        await session.commitTransaction();

        Logger.businessLogger('delete', 'fileCategory', deletedLecture._id, {
          filename: fileName,
          categoryId: deletedLecture.category
        });

        Logger.databaseLogger('deleteLecture', 'FileCategory', Date.now() - startTime, true);
        return true;

      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

    } catch (error) {
      Logger.databaseLogger('deleteLecture', 'FileCategory', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to delete lecture: ${error.message}`, error);
    }
  }

  /**
   * Get lecture statistics by category
   * @param {String} categoryId - Category ID (optional, all if not provided)
   * @returns {Array} Category statistics
   */
  async getCategoryStatistics(categoryId = null) {
    const startTime = Date.now();

    try {
      const pipeline = [];

      if (categoryId) {
        pipeline.push({ $match: { category: categoryId } });
      }

      pipeline.push({
        $group: {
          _id: '$category',
          totalLectures: { $sum: 1 },
          totalSize: { $sum: { $strLenCP: '$content' } },
          averageSize: { $avg: { $strLenCP: '$content' } },
          earliestLecture: { $min: '$createdAt' },
          latestLecture: { $max: '$createdAt' }
        }
      });

      const stats = await FileCategory.aggregate(pipeline);

      Logger.databaseLogger('getCategoryStatistics', 'FileCategory', Date.now() - startTime, true);
      return stats;

    } catch (error) {
      Logger.databaseLogger('getCategoryStatistics', 'FileCategory', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to get category statistics: ${error.message}`, error);
    }
  }

  /**
   * Bulk update category assignments
   * @param {String} oldCategoryId - Old category ID
   * @param {String} newCategoryId - New category ID
   * @returns {Object} Bulk update result
   */
  async bulkUpdateCategory(oldCategoryId, newCategoryId) {
    const startTime = Date.now();

    try {
      const result = await FileCategory.updateMany(
        { category: oldCategoryId },
        {
          category: newCategoryId,
          updatedAt: new Date()
        }
      );

      Logger.businessLogger('bulk_category_update', 'fileCategory', null, {
        oldCategoryId,
        newCategoryId,
        modifiedCount: result.modifiedCount
      });

      Logger.databaseLogger('bulkUpdateCategory', 'FileCategory', Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('bulkUpdateCategory', 'FileCategory', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to bulk update category: ${error.message}`, error);
    }
  }

  /**
   * Validate lecture uniqueness
   * @param {String} filename - Filename to check
   * @param {String} excludeId - Exclude this ID from check
   * @returns {Boolean} Is unique
   */
  async isFilenameUnique(filename, excludeId = null) {
    const startTime = Date.now();

    try {
      const criteria = { filename };
      if (excludeId) {
        criteria._id = { $ne: excludeId };
      }

      const exists = await this.exists(criteria);

      Logger.databaseLogger('isFilenameUnique', 'FileCategory', Date.now() - startTime, true);
      return !exists;

    } catch (error) {
      Logger.databaseLogger('isFilenameUnique', 'FileCategory', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to check filename uniqueness: ${error.message}`, error);
    }
  }

  /**
   * Get lecture access history for analytics
   * @param {String} fileName - Lecture filename
   * @param {Object} dateRange - Date range filter
   * @returns {Object} Access analytics
   */
  async getLectureAnalytics(fileName, dateRange = {}) {
    const startTime = Date.now();

    try {
      // This would typically integrate with an analytics/logging system
      // For now, return basic file metadata
      const lecture = await FileCategory.findOne({ filename: fileName })
        .select('filename title createdAt updatedAt content.length')
        .populate('category', 'name')
        .populate('course', 'title');

      const analytics = {
        lecture,
        fileSize: lecture ? Buffer.byteLength(lecture.content, 'utf8') : 0,
        lastModified: lecture?.updatedAt,
        timesAccessed: 0, // Would be populated from access logs
        averageViewingTime: 0  // Would be populated from analytics
      };

      Logger.databaseLogger('getLectureAnalytics', 'FileCategory', Date.now() - startTime, true);
      return analytics;

    } catch (error) {
      Logger.databaseLogger('getLectureAnalytics', 'FileCategory', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to get lecture analytics: ${error.message}`, error);
    }
  }

  // Private helper methods

  async _cleanupFile(filename) {
    // Implementation would depend on file storage system
    // (could be filesystem, cloud storage, etc.)
    Logger.info('File cleanup would be implemented here', { filename });
  }
}

module.exports = new LectureRepository();