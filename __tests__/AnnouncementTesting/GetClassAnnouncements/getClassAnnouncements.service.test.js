const announcementService = require("../../../src/services/announcement.service");
const Post = require("../../../src/models/Post");

jest.mock("../../../src/models/Post");

describe("Get Class Announcements Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns announcements sorted and populated", async () => {
    const expected = [{ _id: "a1" }, { _id: "a2" }];
    const populate = jest.fn().mockResolvedValue(expected);
    const sort = jest.fn().mockReturnValue({ populate });
    Post.find.mockReturnValue({ sort });

    const result = await announcementService.getClassAnnouncements("class-1");

    expect(Post.find).toHaveBeenCalledWith({
      classId: "class-1",
      type: "ANNOUNCEMENT",
      isDeleted: false,
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(populate).toHaveBeenCalledWith("authorId", "name");
    expect(result).toEqual(expected);
  });
});
