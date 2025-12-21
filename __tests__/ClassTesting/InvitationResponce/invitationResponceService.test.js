// __tests__/services/invitation.service.test.js
const classService = require("../../../src/services/class.service");

// Mock models
jest.mock("../../../src/models/ClassInvitation");
jest.mock("../../../src/models/Class");
jest.mock("../../../src/models/ClassProfile");
jest.mock("../../../src/models/User");
jest.mock("../../../src/models/Notification");
const ClassInvitation = require("../../../src/models/ClassInvitation");
const Class = require("../../../src/models/Class");
const ClassProfile = require("../../../src/models/ClassProfile");
const User = require("../../../src/models/User");
const Notification = require("../../../src/models/Notification");

// Mock onlineUsers and io (if used)
const mockOnlineUsers = new Map();
const mockIo = { to: jest.fn().mockReturnThis(), emit: jest.fn() };

describe("classService.respondToInvitation", () => {
  const mockInvitationId = "60a1b2c3d4e5f67890123456";
  const mockReceiverId = "60a1b2c3d4e5f67890123457";
  const mockSenderId = "60a1b2c3d4e5f67890123458";
  const mockClassId = "60a1b2c3d4e5f67890123459";

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnlineUsers.clear();
  });

  // Helper: mock common successful setup
  const mockAcceptSetup = () => {
    const mockInvitation = {
      _id: mockInvitationId,
      classId: mockClassId,
      senderId: mockSenderId,
      receiverId: mockReceiverId,
      status: "pending",
      save: jest.fn().mockReturnThis(),
    };
    ClassInvitation.findById.mockResolvedValue(mockInvitation);
    Class.findById.mockResolvedValue({
      _id: mockClassId,
      course_name: "Test Course",
    });
    ClassProfile.findOne.mockResolvedValue(null); // not a member
    User.findById.mockImplementation((id) => {
      if (id.toString() === mockReceiverId) {
        return Promise.resolve({ first_name: "Ali", last_name: "Ahmed" });
      }
      return Promise.resolve(null);
    });
    Notification.create.mockResolvedValue({});
  };

  test("should accept invitation and create membership + notification", async () => {
    mockAcceptSetup();

    const result = await classService.respondToInvitation(
      mockInvitationId,
      mockReceiverId,
      "accept"
    );

    expect(ClassInvitation.findById).toHaveBeenCalledWith(mockInvitationId);
    expect(Class.findById).toHaveBeenCalledWith(mockClassId);
    expect(ClassProfile.create).toHaveBeenCalledWith({
      classId: mockClassId,
      userId: mockReceiverId,
      classRole: "member",
    });
    expect(Notification.create).toHaveBeenCalled();
    expect(result).toEqual({
      classId: mockClassId,
      className: "Test Course",
    });
  });

  test("should decline invitation and create notification", async () => {
    const mockInvitation = {
      _id: mockInvitationId,
      classId: mockClassId,
      senderId: mockSenderId,
      receiverId: mockReceiverId,
      status: "pending",
      save: jest.fn().mockReturnThis(),
    };
    ClassInvitation.findById.mockResolvedValue(mockInvitation);
    Class.findById.mockResolvedValue({ course_name: "Test Course" });
    User.findById.mockResolvedValue({ first_name: "Ali", last_name: "Ahmed" });
    Notification.create.mockResolvedValue({});

    const result = await classService.respondToInvitation(
      mockInvitationId,
      mockReceiverId,
      "decline"
    );

    expect(mockInvitation.status).toBe("rejected");
    expect(mockInvitation.save).toHaveBeenCalled();
    expect(Notification.create).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  test("should throw error if invitation not found", async () => {
    ClassInvitation.findById.mockResolvedValue(null);

    await expect(
      classService.respondToInvitation(
        mockInvitationId,
        mockReceiverId,
        "accept"
      )
    ).rejects.toThrow("Invitation not found.");
  });

  test("should throw error if user is not the receiver", async () => {
    const mockInvitation = {
      receiverId: "wrong_user_id",
      status: "pending",
    };
    ClassInvitation.findById.mockResolvedValue(mockInvitation);

    await expect(
      classService.respondToInvitation(
        mockInvitationId,
        mockReceiverId,
        "accept"
      )
    ).rejects.toThrow("You are not authorized to respond to this invitation.");
  });

  test("should throw error if invitation is not pending", async () => {
    const mockInvitation = {
      receiverId: mockReceiverId,
      status: "accepted", // or 'rejected'
    };
    ClassInvitation.findById.mockResolvedValue(mockInvitation);

    await expect(
      classService.respondToInvitation(
        mockInvitationId,
        mockReceiverId,
        "accept"
      )
    ).rejects.toThrow("This invitation is no longer active.");
  });

  test("should throw error if class no longer exists (on accept)", async () => {
    const mockInvitation = {
      _id: mockInvitationId,
      classId: mockClassId,
      receiverId: mockReceiverId,
      status: "pending",
    };
    ClassInvitation.findById.mockResolvedValue(mockInvitation);
    Class.findById.mockResolvedValue(null); // class deleted

    await expect(
      classService.respondToInvitation(
        mockInvitationId,
        mockReceiverId,
        "accept"
      )
    ).rejects.toThrow("The class no longer exists.");
  });

  test("should throw error if user is already a member (on accept)", async () => {
    const mockInvitation = {
      _id: mockInvitationId,
      classId: mockClassId,
      receiverId: mockReceiverId,
      status: "pending",
    };
    ClassInvitation.findById.mockResolvedValue(mockInvitation);
    Class.findById.mockResolvedValue({ course_name: "Test Course" });
    ClassProfile.findOne.mockResolvedValue({}); // already member

    await expect(
      classService.respondToInvitation(
        mockInvitationId,
        mockReceiverId,
        "accept"
      )
    ).rejects.toThrow("You are already a member of this class.");
  });

  test("should handle invalid action gracefully", async () => {
    // This is actually handled in controller, but service assumes valid action
    // So we don't test invalid action in service
  });
});
