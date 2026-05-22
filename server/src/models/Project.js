import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    role: {
      type: String,
      enum: ["Admin", "Member"],
      default: "Member"
    }
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 600,
      default: ""
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    members: {
      type: [memberSchema],
      validate: {
        validator(members) {
          const ids = members.map((member) => member.user.toString());
          return ids.length === new Set(ids).size;
        },
        message: "Project members must be unique"
      }
    }
  },
  { timestamps: true }
);

export const Project = mongoose.model("Project", projectSchema);
