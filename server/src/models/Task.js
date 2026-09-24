import mongoose from "mongoose";

const expenseItemSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ""
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }
);

const subTaskSchema = new mongoose.Schema(
  {
    sequenceNo: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    quantity: {
      type: Number,
      default: 1,
      min: 0
    },
    status: {
      type: String,
      enum: [
        "Order Placed",
        "Material in Transit",
        "Order Received",
        "Order Accepted",
        "Order Rejected",
        "Order Returned"
      ],
      default: "Order Placed"
    },
    action: {
      type: String,
      enum: ["Fabrication", "Purchase"],
      default: "Fabrication"
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    dueDate: {
      type: Date,
      required: false
    }
  }
);

const taskSchema = new mongoose.Schema(
  {
    subTasks: [subTaskSchema],
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 140
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["Todo", "In Progress", "Done"],
      default: "Todo"
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    },
    dueDate: {
      type: Date,
      required: true
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0
    },
    actualCost: {
      type: Number,
      default: 0,
      min: 0
    },
    expenses: [expenseItemSchema]
  },
  { timestamps: true }
);

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1, dueDate: 1 });

export const Task = mongoose.model("Task", taskSchema);
