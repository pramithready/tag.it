// Install these dependencies before you run
const Post = require("../models/Post");
const { db } = require("../shared/firebase")
const { InternalServerError } = require("../shared/error");
const User = require("./User");
const Tag = require("./Tag");
const { makeId } = require("../shared/util");

class Course {
    constructor(props) {
        this.props = props;
    }
    
    equalTo = (other) => {
        return (
            this.arraysEqual(this.props.tagList, other.props.tagList) &&
            this.arraysEqual(this.props.instructorList, other.props.instructorList) &&
            this.arraysEqual(this.props.postList, other.props.postList) &&
            this.arraysEqual(this.props.studentList, other.props.studentList) &&
            this.props.uuid === other.props.uuid &&
            this.props.term === other.props.term &&
            this.props.name === other.props.name
        )
    }

    
    arraysEqual = (a, b) => {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (a.length != b.length) return false;
      
        // If you don't care about the order of the elements inside
        // the array, you should sort both arrays here.
        // Please note that calling sort on an array will modify that array.
        // you might want to clone your array first.
      
        for (var i = 0; i < a.length; ++i) {
          if (a[i] !== b[i]) return false;
        }
        return true;
    }

    updateCourse = async () => {
        let other = await getCourseById(this.props.uuid);
        while(!this.equalTo(other)) {
            this.props = other.props;
            other = await getCourseById(this.props.uuid);
        }
    }

    getName() {
        return this.props.name;
    }

    getTerm() {
        return this.props.term;
    }

    getInstructorList = async () => {
        await this.updateCourse();
        return this.props.instructorList.slice(1, this.props.instructorList.length);
    }

    getUUID() {
        return this.props.uuid;
    }

    getTagList() {
        return this.props.tagList.slice(1, this.props.tagList.length);
    }

    getStudentList = async () => {
        await this.updateCourse();
        return this.props.studentList.slice(1, this.props.studentList.length);
    }

    getPostList() {
        return this.props.postList.slice(1, this.props.postList.length);
    }

    getDescription() {
        return this.props.description;
    }
    
    getStudentInviteId() {
        return this.props.studentInviteId;
    }

    getInstructorInviteId() {
        return this.props.instructorInviteId;
    }

    getPendingInstructorList = async () => {
        await this.updateCourse();
        return this.props.pendingInstructorList.slice(1, this.props.pendingInstructorList.length);
    }

    setName = async (name) => {
        this.props.name = name;
        await this.push();
    }

    setTerm = async (term) => {
        this.props.term = term;
        await this.push();
    }

    setDescription = async (desc) => {
        this.props.description = desc;
        await this.push();
    }

    addTag = async (tagId) => {
        await this.updateCourse();
        this.props.tagList.push(tagId);
        await this.push();
    }

    removeTag = async (tagId) => {
        await this.updateCourse();
        this.props.tagList.splice(
            this.props.tagList.indexOf(tagId)
        );
        await this.push();
    }

    addStudent = async (userId) => {
        await this.updateCourse();
        if (this.props.studentList.indexOf(userId) < 0) {
            this.props.studentList.push(userId);
            await this.push();
        } else {
            throw new InternalServerError(`Student ${userId} already exists in this course.`);
        }
    }

    addInstructor = async (userId, userEmail = null) => {
        await this.updateCourse();
        if (this.props.instructorList.indexOf(userId) < 0) {
            this.props.instructorList.push(userId);

            // Checks if instructor is in pendingInstructorList and removes if so
            while (this.props.pendingInstructorList.indexOf(userEmail) >= 0) {
                this.props.pendingInstructorList.splice(this.props.pendingInstructorList.indexOf(userEmail), 1);
            }
        }

        await this.push();
    }

    addPost = async (postId) => {
        await this.updateCourse();
        this.props.postList.push(postId);
        await this.push();
    }

    addPendingInstructor = async (userEmail) => {
        this.updateCourse();
        if (this.props.pendingInstructorList.indexOf(userEmail) < 0) {
            this.props.pendingInstructorList.push(userEmail);
            await this.push();
        }
    }

    removePost = async (postId) => {
        await this.updateCourse();
        const index = this.props.postList.indexOf(postId);
        if (index != -1) {
            this.props.postList.splice(index, 1);
        }
        await this.push();
    }

    removePendingInstructor = async (userEmail) => {
        await this.updateCourse();
        if (this.props.pendingInstructorList.indexOf(userEmail) >= 0) {
            this.props.pendingInstructorList.splice(this.props.pendingInstructorList.indexOf(userEmail), 1);
            await this.push();
        }
    }
    
    removeInstructor = async (userId) => {
        await this.updateCourse();

        if (this.props.instructorList.indexOf(userId) >= 0) {      
            this.props.instructorList.splice(this.props.instructorList.indexOf(userId), 1);
            await this.push();
            const userObj = await User.getUserById(userId);
            await userObj.removeInstructorCourse(this.props.uuid);
        }
    }

    removeStudent = async (userId) => {
        await this.updateCourse();
        if (this.props.studentList.indexOf(userId) >= 0) {
            this.props.studentList.splice(this.props.studentList.indexOf(userId), 1);
            await this.push();

            const userObj = await User.getUserById(userId);
            await userObj.removeStudentCourse(this.props.uuid);
        }
    }

    getPostsWithTag = async (tagId) => {
        let list = this.getPostList();
        const posts = [];
        for (let i = 0; i < list.length; i ++) {
            // get each post object from firebase
            //console.log(list[i]);
            const currentPost = await Post.getPostById(list[i]);
            const tagList = await currentPost.getTagList();
            for (let j = 0; j < tagList.length; j ++) {
                if (tagList[j] === tagId) {
                    posts.push(currentPost);
                    break;
                }
            }
        }
        return posts;
    }

    classifyUser = (uuid) => {
        for (let i = 0; i < this.props.instructorList.length; i ++) {
            if (this.props.instructorList[i] === uuid) {
                return "instructor";
            }
        }
        for (let i = 0; i < this.props.studentList.length; i ++) {
            if (this.props.studentList[i] === uuid) {
                return "student";
            }
        }
        return null;
    }

    getPrivatePosts = async () => {
        return new Promise(async (resolve, reject) => {
            let list = this.getPostList();
            const posts = [];
            for (let i = 0; i < list.length; i ++) {
                const currentPost = await Post.getPostById(list[i]);
                if (currentPost.isPrivate()) {
                    posts.push(currentPost.getUUID());
                }
            }
            resolve(posts);
        })   
    }

    getPublicPosts = async () => {
        return new Promise(async (resolve, reject) => {
            let list = this.getPostList();
            const posts = [];
            for (let i = 0; i < list.length; i ++) {
                const currentPost = await Post.getPostById(list[i]);
                if (!currentPost.isPrivate()) {
                    posts.push(currentPost.getUUID());
                }
            }
            resolve(posts);
        })      
    }

    getPinnedPosts = async () => {
        return new Promise(async (resolve, reject) => {
            let list = this.getPostList();
            const posts = [];
            for (let i = 0; i < list.length; i ++) {
                const currentPost = await Post.getPostById(list[i]);
                if (currentPost.isPinned()) {
                    posts.push(currentPost.getUUID());
                }
            }
            resolve(posts);
        })      
    }

    getAnnouncements = async() => {
        return new Promise(async (resolve, reject) => {
            let list = this.getPostList();
            const posts = [];
            for (let i = 0; i < list.length; i ++) {
                const currentPost = await Post.getPostById(list[i]);
                if (currentPost.isAnnouncement()) {
                    posts.push(currentPost.getUUID());
                }
            }
            resolve(posts);
        })  
    }

    getPostsWithMultipleTags = async (tagList) => {
        let posts = {};
        for(let i = 0; i < tagList.length; i++) {
            let newPosts = await this.getPostsWithTag(tagList[i]);
            newPosts.forEach(post => {
                posts[post.getUUID()] = post;
            })
        };
        return Object.values(posts);
    }

    /**
     * Update a given post's data fields.
     * 
     * @param updateParams - Object consisting of keys & values that will be updated for the user
     */
    push = async () => {
        await db.ref("Courses").child(this.props.uuid).set({
            name: this.props.name, 
            term: this.props.term,
            description: this.props.description,
            uuid: this.props.uuid,
            instructorList: this.props.instructorList, 
            studentList: this.props.studentList,
            tagList: this.props.tagList,
            postList: this.props.postList,
            studentInviteId: this.props.studentInviteId ? this.props.studentInviteId : makeId(10),
            instructorInviteId: this.props.instructorInviteId ? this.props.instructorInviteId : makeId(10),
            pendingInstructorList: this.props.pendingInstructorList ? this.props.pendingInstructorList : ["dummy_val"]
        });
    } 
}

module.exports.pushCourseToFirebase = (updateParams, user, courseUUID) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (courseUUID) {
                await db.ref("Courses").child(courseUUID).set(updateParams);
                resolve(courseUUID);
            } else {
                const courseRef = await db.ref("Courses").push();

                await courseRef.set({
                    name: updateParams['name'],
                    term: updateParams['term'], 
                    uuid: courseRef.key,
                    studentInviteId: makeId(10),
                    instructorInviteId: makeId(10),
                    studentList: ["dummy_val"],         // Firebase doesn't initialize a list if its empty
                    instructorList: ["dummy_val", user.getUUID()],
                    pendingInstructorList: ["dummy_val"],
                    tagList: ["dummy_val"],
                    postList: ["dummy_val"],
                    description: updateParams['description']
                });
                await user.addInstructorCourse(courseRef.key);

                // add all the tags
                updateParams.tagList = updateParams.tagList || [];
                for await (const tagName of updateParams.tagList) {
                    await Tag.pushTagToFirebase({
                        name: tagName,
                        course: courseRef.key
                    })
                }

                resolve(courseRef.key);
            }
        } catch(e) {
            console.log("There was an error: " + e);
            reject(e);
        }
    })
};

getCourseById = async (uuid) => {
    const ref = db.ref(`Courses/${uuid}`);

    return new Promise((resolve, reject) => {
        ref.once("value", function(snapshot) {
            let r = new Course(snapshot.val());
            if (!r.props.pendingInstructorList) {
                r.props.pendingInstructorList = [];
            }
            resolve(r);
        }, function (errorObject) {
            reject(errorObject);
        })
    }) 
}

deleteCourseById = async (uuid) => {
    const ref = db.ref(`Courses/${uuid}`);
    try{
        const result = await ref.remove();
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}
   
module.exports.Course = Course;
module.exports.getCourseById = getCourseById;
module.exports.deleteCourseById = deleteCourseById;