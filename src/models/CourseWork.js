const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const courseworkSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Coursework name is required.'],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [200, 'Notes cannot exceed 200 characters.'],
    },
    description: {
      type: String,
      trim: true,
    },
    grade: {
      type: Number,
      min: [0, 'Grade cannot be negative.'],
      max: [100, 'Grade cannot exceed 100.'],
    },
    team_size_min: {
      type: Number,
      min: [1, 'Minimum team size must be at least 1.'],
    },
    team_size_max: {
      type: Number,
      min: [1, 'Maximum team size must be at least 1.'],
    },

    // Dates
    deadline: {
      type: Date,
      required: [true, 'Deadline is required.'],
    },
    discussion_date: {
      type: Date,
    },
    include_discussion: {
      type: Boolean,
      default: false,
    },
    // Grading criteria: dynamic list (e.g., "Code works": 5, "Servlets implemented": 5)
    grading_criteria: [
      {
        criterion: {
          type: String,
          trim: true,
          maxlength: [100, 'Criterion name too long.'],
        },
        points: {
          type: Number,
          min: [0, 'Points cannot be negative.'],
          max: [100, 'Points cannot exceed 100.'],
        },
      },
    ],

    // Relationships
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required.'],
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author ID is required.'],
    },

    // Files uploaded with this coursework
    files: [
      {
        file_name: {
          type: String,
          required: true,
        },
        file_url: {
          type: String,
          required: true,
        },
        download_url: {  
      type: String,
    },
        file_size: {
          type: Number, 
        },
        uploaded_at: {
          type: Date,
          default: Date.now,
        },
        uploaded_by: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

courseworkSchema.pre('save', function (next) {
  if (this.team_size_min != null && this.team_size_max != null) {
    if (this.team_size_min > this.team_size_max) {
      return next(new Error('Minimum team size cannot be greater than maximum.'));
    }
  }
  next();
});

courseworkSchema.index({ classId: 1, isDeleted: 1 });
courseworkSchema.index({ deadline: 1 });
courseworkSchema.index({ authorId: 1 });

const Coursework = model('Coursework', courseworkSchema);
module.exports = Coursework;