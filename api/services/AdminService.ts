import con from "../utils/Connection";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import {
  Time,
  insertDataQuery,
  isValEmpty,
  isValEmptyArray,
  selectAllQuery,
  updateAuthFields,
  updateDataSelectedFields,
  uploadImage,
  watchLog,
} from "../utils/Higherorderfunction";
import { exclude } from "../utils/Excludefied";
import logger from "../middlewares/Logger";
import { generateAccessAndRefereshTokens } from "../utils/generateRefreshToken";

export interface RequestAuthType extends Request {
  auth?: { userId?: string };
}

interface User extends RowDataPacket {
  id: number;
  name: string;
}
interface UserData extends RowDataPacket {
  user_id: number;
}

export default class AdminModel {
  async AdminSignup(req: RequestAuthType, res: Response) {
    const { userName, password, userRole } = req.body;

    const addAdmin = `INSERT INTO user SET ?`;

    const saltRounds = 10;

    const isUserExistQuery = `SELECT * FROM user WHERE user_name='${userName}'`;

    const findUserQuery = `SELECT * FROM user WHERE user_id=?`;

    const isAdminExist = `SELECT * FROM user WHERE user_role='Admin'`;

    watchLog(req);

    try {
      const [isAdminExistExecute] =
        await con.query<RowDataPacket[]>(isAdminExist);

      if (isAdminExistExecute.length > 0) {
        return res.status(400).json({
          status: 0,
          data: "",
          message: "Admin already exists",
          error: "Admin already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const adminData = {
        user_name: userName,
        user_password: hashedPassword,
        user_role: userRole,
      };

      const [isUserExistResult] =
        await con.query<RowDataPacket[]>(isUserExistQuery);

      if (isUserExistResult.length > 0) {
        return res.status(400).json({
          status: 0,
          message: "User already exists with this name",
          error: "User already exists with this name",
        });
      }

      const [insertExecute] = await con.query<ResultSetHeader>(addAdmin, [
        adminData,
      ]);

      if (insertExecute.affectedRows > 0) {
        const [findUserExecute] = await con.query<User[]>(findUserQuery, [
          insertExecute.insertId,
        ]);

        const removeNullValues = isValEmpty(findUserExecute[0]);

        return res.status(200).json({
          status: 1,
          data: removeNullValues,
          message: "Admin Added Successfully!",
        });
      }
    } catch (error) {
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        message: "Something went wrong",
        error: "Somthing went wrong",
      });
    }
  }

  async AdminLogin(req: RequestAuthType, res: Response) {
    const { userName, password } = req.body;

    const isUserExistQuery = `SELECT * FROM user WHERE user_name='${userName}'`;

    watchLog(req);

    try {
      const [isUserExistResult] =
        await con.query<RowDataPacket[]>(isUserExistQuery);

      if (isUserExistResult.length === 0) {
        return res.status(400).json({
          status: 0,
          message: "No user Found",
          error: "No user Found",
        });
      }

      const { user_password: hashedPassword, user_id } = isUserExistResult[0];

      const isPassword = await bcrypt.compare(password, hashedPassword);

      if (isPassword) {
        const { user_access_token, refresh_token, error } =
          await generateAccessAndRefereshTokens(user_id);

        if (error)
          return res.status(500).json({
            status: 0,
            message: "Something went wrong while generating token",
            error: "Something went wrong while generating token",
          });

        // await con.query<RowDataPacket[]>(isUserExistQuery);

        return res.status(200).json({
          status: 1,
          data: {
            refresh_token: refresh_token,
            access_token: user_access_token,
          },
          message: "Success",
        });
      } else {
        return res.status(400).json({
          status: 0,
          message: "Invalid credentials",
          error: "Invalid credentials",
        });
      }
    } catch (error) {
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        message: "Something went wrong",
        error: "Somthing went wrong",
      });
    }
  }

  async AllTableLists(req: RequestAuthType, res: Response) {
    const page: string = req.query.page as string;

    const search: string = req.query.search as string;

    const list: string = req.query.list as string;

    const int_page = parseInt(page) ?? 1;

    const pageSize = 15;

    const offset = (int_page - 1) * pageSize;

    let findUserQuery = `SELECT * FROM user`;

    let findCountQuery = ` SELECT COUNT(*) as totalCount FROM user`;

    if (list) {
      findUserQuery = `SELECT * FROM ${list}`;

      findCountQuery = `SELECT COUNT(*) as totalCount FROM ${list}`;
    }

    if (search) {
      findUserQuery += ` WHERE user_name LIKE '${search}%'`;
    }

    findUserQuery += ` LIMIT ? OFFSET ?`;

    let data: any = [];

    try {
      const [findUserExecute] = await con.query<RowDataPacket[]>(
        findUserQuery,
        [pageSize, offset]
      );

      const [findCountExecute] =
        await con.query<RowDataPacket[]>(findCountQuery);

      if (list === "user") {
        data = findUserExecute.map((listItem) => {
          return { ...listItem, id: listItem.user_id };
        });
      }

      if (list === "tribe") {
        data = findUserExecute.map((listItem) => {
          return { ...listItem, id: listItem.tribe_id };
        });
      }

      if (list === "blimp") {
        data = findUserExecute.map((listItem) => {
          return { ...listItem, id: listItem.blimps_id };
        });
      }

      if (list === "question") {
        data = findUserExecute.map((listItem) => {
          return { ...listItem, id: listItem.question_id };
        });
      }

      if (list === "report") {
        data = findUserExecute.map((listItem) => {
          return { ...listItem, id: listItem.report_id };
        });
      }
      if (list === "category") {
        data = findUserExecute.map((listItem) => {
          return { ...listItem, id: listItem.category_id };
        });
      }

      const removeNullValues = isValEmptyArray(data);

      return res.status(200).json({
        status: 1,
        data: {
          data: removeNullValues,
          count: findCountExecute[0].totalCount,
          details: {},
        },
        message: "Success",
      });
    } catch (error) {
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        message: "Somthing went wrong",
        error: "Somthing went wrong",
      });
    }
  }

  async UserDetail(req: RequestAuthType, res: Response) {
    const { id } = req.params;

    const findUserQuery = `SELECT u.*
    FROM user u
    WHERE user_id = ?`;

    const profleImagesQuery = `SELECT * FROM profile_images WHERE author_id=? AND type='profile_images'`;

    const profileSelfieQuery = `SELECT * FROM profile_images WHERE author_id=? AND type='selfie'`;

    const profileIdProofQuery = `SELECT * FROM profile_images WHERE author_id=? AND type='best_pics'`;

    watchLog(req);

    try {
      const findUserExecute = con.query<RowDataPacket[]>(findUserQuery, [id]);

      const profleImagesExecute = con.query<RowDataPacket[]>(
        profleImagesQuery,
        [id]
      );

      const profileSelfieExecute = con.query<RowDataPacket[]>(
        profileSelfieQuery,
        [id]
      );

      const profileIdProofExecute = con.query<RowDataPacket[]>(
        profileIdProofQuery,
        [id]
      );

      const [
        findUserResult,
        profleImagesResult,
        profileSelfieResult,
        profileIdProofResult,
      ] = await Promise.all([
        findUserExecute,
        profleImagesExecute,
        profileSelfieExecute,
        profileIdProofExecute,
      ]);

      const removeNullValues = isValEmpty(findUserResult[0][0] || {});

      const removeNullImages = isValEmpty(profleImagesResult[0][0] || {});

      const removeNullSelfie = isValEmpty(profileSelfieResult[0][0] || {});

      const removeNullId = isValEmptyArray(profileIdProofResult[0]);

      const removeAuth = exclude(removeNullValues, [
        "user_access_token",
        "user_password",
      ]);

      return res.status(200).json({
        status: 1,
        data: {
          ...removeAuth,
          profileImage: removeNullImages,
          selfie: removeNullSelfie,
          id: removeNullId,
        },
        message: "Success",
      });
    } catch (error) {
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,

        message: "Something went wrong",
        error: "Somthing went wrong",
      });
    }
  }

  // async TribeDetail(req: RequestAuthType, res: Response) {
  //   const { id } = req.params;

  //   const findUserQuery = `SELECT t.*,user_name,image_url,category_name
  //   FROM tribe t
  //   LEFT JOIN user AS u ON u.user_id=t.tribe_author_id
  //   LEFT JOIN category c ON c.category_id=t.tribe_category_id
  //   LEFT JOIN images AS i ON i.image_id=t.tribe_image
  //   WHERE tribe_id = ?`;

  //   let findTribeMessage = `SELECT tc.*,u.user_name,u.user_id
  //   FROM tribe_chat tc
  //   LEFT JOIN user as u on u.user_id= tc.tc_author_id
  //   WHERE tc_tribe_id=?`;

  //   if (page) {
  //     findTribeMessage += ` ORDER BY tc_message_created_at DESC
  //     LIMIT ? OFFSET ?`
  //   }

  //   watchLog(req);

  //   try {
  //     const findUserExecute = con.query<RowDataPacket[]>(findUserQuery, [id]);

  //     const profleImagesExecute = con.query<RowDataPacket[]>(
  //       profleImagesQuery,
  //       [id]
  //     );

  //     const profileSelfieExecute = con.query<RowDataPacket[]>(
  //       profileSelfieQuery,
  //       [id]
  //     );

  //     const profileIdProofExecute = con.query<RowDataPacket[]>(
  //       profileIdProofQuery,
  //       [id]
  //     );

  //     const [
  //       findUserResult,
  //       profleImagesResult,
  //       profileSelfieResult,
  //       profileIdProofResult,
  //     ] = await Promise.all([
  //       findUserExecute,
  //       profleImagesExecute,
  //       profileSelfieExecute,
  //       profileIdProofExecute,
  //     ]);

  //     const removeNullValues = isValEmpty(findUserResult[0][0] || {});

  //     const removeNullImages = isValEmpty(profleImagesResult[0][0] || {});

  //     const removeNullSelfie = isValEmpty(profileSelfieResult[0][0] || {});

  //     const removeNullId = isValEmptyArray(profileIdProofResult[0]);

  //     const removeAuth = exclude(removeNullValues, [
  //       "user_access_token",
  //       "user_password",
  //     ]);

  //     return res.status(200).json({
  //       status: 1,
  //       data: {
  //         ...removeAuth,
  //         profileImage: removeNullImages,
  //         selfie: removeNullSelfie,
  //         id: removeNullId,
  //       },
  //       message: "Success",
  //     });
  //   } catch (error) {
  //     logger.error(`${error}`);
  //     return res.status(400).json({
  //       status: 0,

  //       message: "Something went wrong",
  //       error: "Somthing went wrong",
  //     });
  //   }
  // }

  async QuestionDetail(req: RequestAuthType, res: Response) {
    const { id } = req.params;

    const findQuestionQuery = `SELECT * FROM question WHERE question_id=?`;

    const findOptionQuery = `SELECT * FROM question_option WHERE question_option_relation_id=?`;

    try {
      const [findQuestionExecute] = await con.query<RowDataPacket[]>(
        findQuestionQuery,
        [id]
      );

      const removeNullValues = isValEmpty(findQuestionExecute[0]);

      const [findOptionExecute] = await con.query<RowDataPacket[]>(
        findOptionQuery,
        [removeNullValues.question_id]
      );

      const option = isValEmptyArray(findOptionExecute);

      return res.status(200).json({
        status: 1,
        data: { question: removeNullValues, option: option },
        message: "Success",
      });
    } catch (error) {
      console.log("err", error);
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        error: "Something went wrong",
        message: "Something went wrong",
      });
    }
  }

  async BlimpDetail(req: RequestAuthType, res: Response) {
    const { id } = req.params;

    const findBlimpQuery = `SELECT b.*,c.category_type,c.category_name,u.user_name,u.user_id
    FROM blimp b
    LEFT JOIN user AS u ON u.user_id=b.blimp_author_id
    LEFT JOIN category AS c ON c.category_id=b.blimp_category_id
    WHERE b.blimps_id=?`;

    try {
      const [findBlimpExecute] = await con.query<RowDataPacket[]>(
        findBlimpQuery,
        [id]
      );

      const removeNullValues = isValEmptyArray(findBlimpExecute);

      return res.status(200).json({
        status: 1,
        data: removeNullValues,
        message: "Success",
      });
    } catch (error) {
      console.log("err", error);
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        error: "Something went wrong",
        message: "Something went wrong",
      });
    }
  }

  async ReportDetail(req: RequestAuthType, res: Response) {
    const { id } = req.params;

    const findReportQuery = `SELECT r.*,u.user_name as reportee_user_name,u.user_id as reportee_user_id,ru.user_name as reported_user_name,ru.user_id as reported_user_id
    FROM report r
    LEFT JOIN user AS u ON u.user_id=r.report_author_id
    LEFT JOIN user AS ru ON ru.user_id=r.report_user_id
    WHERE r.report_id=?`;

    const profleImagesQuery = `SELECT * FROM profile_images WHERE author_id=? AND type='profile_image'`;

    try {
      const [findReportExecute] = await con.query<RowDataPacket[]>(
        findReportQuery,
        [id]
      );

      const reporteeProfileImageExecute = con.query<RowDataPacket[]>(
        profleImagesQuery,
        [findReportExecute[0].reportee_user_id]
      );

      const reportedProfleImageExecute = con.query<RowDataPacket[]>(
        profleImagesQuery,
        [findReportExecute[0].reported_user_id]
      );

      const [reporteeProfileImageResult, reportedProfleImageResult] =
        await Promise.all([
          reporteeProfileImageExecute,
          reportedProfleImageExecute,
        ]);

      const removeNullValues = isValEmpty(findReportExecute[0] || {});

      return res.status(200).json({
        status: 1,
        data: {
          ...removeNullValues,
          reporteeProfileImage:
            reporteeProfileImageResult[0][0]?.image_url ?? "",
          reportedProfileImage:
            reportedProfleImageResult[0][0]?.image_url ?? "",
        },
        message: "Success",
      });
    } catch (error) {
      console.log("err", error);
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        error: "Something went wrong",
        message: "Something went wrong",
      });
    }
  }

  async CategoryDetail(req: RequestAuthType, res: Response) {
    const { id } = req.params;

    const findCategoryQuery = `SELECT * FROM category WHERE category_id=?`;

    try {
      const [findCategoryExecute] = await con.query<RowDataPacket[]>(
        findCategoryQuery,
        [id]
      );

      const removeNullValues = isValEmpty(findCategoryExecute[0] || {});

      return res.status(200).json({
        status: 1,
        data: removeNullValues,
        message: "Success",
      });
    } catch (error) {
      console.log("err", error);
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        error: "Something went wrong",
        message: "Something went wrong",
      });
    }
  }

  async OptionDetail(req: RequestAuthType, res: Response) {
    const { id } = req.params;

    const findTermsQuery = `SELECT * 
    FROM terms t
    LEFT JOIN interest_image as ii ON ii.i_image_term_id=t.term_id
    WHERE term_id=?`;

    try {
      const [findTermsExecute] = await con.query<RowDataPacket[]>(
        findTermsQuery,
        [id]
      );
      const removeNullValues = isValEmpty(findTermsExecute[0] || {});

      return res.status(200).json({
        status: 1,
        data: removeNullValues,
        message: "Success",
      });
    } catch (error) {
      console.log("err", error);
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        error: "Something went wrong",
        message: "Something went wrong",
      });
    }
  }

  async UpdateUser(req: RequestAuthType, res: Response) {
    const { id } = req.params;

    const { is_verified } = req.body;

    const findUserQuery = `SELECT user_id as id, user_name as name, user_number as number, user_email as email, user_gender as gender,user_location as location,user_lat as lat,user_lng as lng
    FROM user u
    WHERE user_id = ?`;

    const updateUserQuery = `UPDATE user SET user_is_verified=? WHERE user_id=?`;

    const findNearByUsers = `SELECT user_email,user_device_token
    FROM user
    WHERE user_lat >= ? AND user_lat <= ?
    AND user_lng >= ? AND user_lng <= ?
    ORDER BY ABS(user_lat - ?) + ABS(user_lng - ?) ASC`;
    
    watchLog(req);

    try {
      const [findUserExecute] = await con.query<RowDataPacket[]>(
        findUserQuery,
        [id]
      );

      if (findUserExecute.length === 0) {
        return res
          .status(404)
          .json({ status: 0, message: "Not found", error: "Not found" });
      }
      const { lat, lng } = findUserExecute[0];
      
      const parse_lat = parseFloat(lat);

      const parse_lng = parseFloat(lng);

      const radiusInMeters = 600000;

      const earthRadiusInKm = 6371;

      const latitudeRange =
        (radiusInMeters / 1000 / earthRadiusInKm) * (180 / Math.PI);

      const longitudeRange =
        ((radiusInMeters / 1000 / earthRadiusInKm) * (180 / Math.PI)) /
        Math.cos((parse_lat * Math.PI) / 180);

      const range1 = parse_lat - latitudeRange;

      const range2 = parse_lat + latitudeRange;

      const range3 = parse_lng - longitudeRange;

      const range4 = parse_lng + longitudeRange;

      const [findNearByUsersExecute] = await con.query<UserData[]>(
        findNearByUsers,
        [range1, range2, range3, range4, parse_lat, parse_lng]
      );

      const userEmails = findNearByUsersExecute
        .map((user) => user.user_email)
        .filter(Boolean);
      const userTokens = findNearByUsersExecute
        .map((user) => user.user_device_token)
        .filter(Boolean);
      console.log("user", userTokens);
      console.log("user", userEmails);

      // await con.query<RowDataPacket[]>(updateUserQuery, [is_verified, id])

      // const [findUpdatedUserExecute] = await con.query<RowDataPacket[]>(findUserQuery, [id])

      // const removeNullUser = isValEmpty(userIds[0] || {})

      return res
        .status(200)
        .json({ status: 1, data: userEmails[0], message: "Success" });
    } catch (error) {
      console.log("error", error);
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        message: "Something went wrong",
        error: "Somthing went wrong",
      });
    }
  }

  async Dashboard(req: RequestAuthType, res: Response) {
    const userMaleCount = ` SELECT COUNT(*) as totalCount FROM user WHERE user_gender = 'Male'`;

    const userFemaleCount = `SELECT COUNT(*) as totalCount FROM user WHERE user_gender = 'Female'`;

    const isMemberQuery = `SELECT COUNT(*) as totalCount FROM user WHERE user_is_member = 1`;

    watchLog(req);

    try {
      const [userMaleExecute] = await con.query<RowDataPacket[]>(userMaleCount);

      const [userFemaleExecute] =
        await con.query<RowDataPacket[]>(userFemaleCount);

      const [isMemberExecute] = await con.query<RowDataPacket[]>(isMemberQuery);

      return res.status(200).json({
        status: 1,
        data: {
          male: userMaleExecute[0].totalCount,
          female: userFemaleExecute[0].totalCount,
          member: isMemberExecute[0].totalCount,
        },
        message: "Success",
      });
    } catch (error) {
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        message: "Somthing went wrong",
        error: "Somthing went wrong",
      });
    }
  }

  async AddCategory(req: RequestAuthType, res: Response) {
    const userId = req["auth"]?.userId;

    const current_time = new Date();

    const time = Math.floor(current_time.getTime() / 1000);

    const payload = {
      ...req.body,
      category_time: time,
      category_author_id: userId,
    };

    const { insertQuery, insertParams } = insertDataQuery("category", payload);

    const findCategoryQuery = "SELECT * FROM category WHERE category_id = ?";

    watchLog(req, userId);

    try {
      const [isCategoryExecute] = await con.query<ResultSetHeader>(
        insertQuery,
        insertParams
      );

      const [findCategoryExecute] = await con.query<User[]>(findCategoryQuery, [
        isCategoryExecute.insertId,
      ]);

      const removeNullValues = isValEmpty(findCategoryExecute[0]);

      return res.status(200).json({
        status: 1,
        data: removeNullValues,
        message: "Category Added Successfully",
      });
    } catch (error) {
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        message: "Something went wrong",
        error: "Something went wrong",
      });
    }
  }

  async UpdateCategory(req: RequestAuthType, res: Response) {
    const fieldsToUpdate = req.body;

    const id = req.params.id;

    const { findQuery } = selectAllQuery("category", "category_id");

    const { updateQuery, updateParams } = updateDataSelectedFields(
      fieldsToUpdate,
      id,
      "category_id",
      "category"
    );

    watchLog(req);

    try {
      await con.query<ResultSetHeader>(updateQuery, updateParams);

      const [getCategoryExecute] = await con.query<RowDataPacket[]>(findQuery, [
        id,
      ]);

      const removeNullValues = isValEmpty(getCategoryExecute[0]);

      return res.status(200).json({
        status: 1,
        data: removeNullValues,
        message: "Update Successfully",
      });
    } catch (error) {
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        message: "Somthing went wrong",
        error: "Somthing went wrong",
      });
    }
  }

  async CategoryList(req: RequestAuthType, res: Response) {
    const { query } = req.query;

    const page: string = req.query.page as string;

    const search: string = req.query.search as string;

    const int_page = parseInt(page) || 1;

    const pageSize = 15;

    const offset = (int_page - 1) * pageSize;

    let findCategoryQuery = `SELECT * FROM category WHERE category_type = '${query}'`;

    const findCountQuery = ` SELECT COUNT(*) as totalCount FROM category`;

    if (search) {
      findCategoryQuery += ` WHERE category_name LIKE '${search}%'`;
    }

    findCategoryQuery += ` LIMIT ? OFFSET ?`;

    try {
      if (query === "blimp") {
        const [findCategoryExecute] = await con.query<RowDataPacket[]>(
          findCategoryQuery,
          [pageSize, offset]
        );

        const removeNullValues = isValEmptyArray(findCategoryExecute);

        return res
          .status(200)
          .json({ status: 1, data: removeNullValues, message: "Success" });
      }

      if (query === "tribe") {
        const [findCategoryExecute] = await con.query<RowDataPacket[]>(
          findCategoryQuery,
          [pageSize, offset]
        );

        const removeNullValues = isValEmptyArray(findCategoryExecute);

        return res
          .status(200)
          .json({ status: 1, data: removeNullValues, message: "Success" });
      } else {
        const [findCategoryExecute] = await con.query<RowDataPacket[]>(
          findCategoryQuery,
          [pageSize, offset]
        );

        const [findCountExecute] =
          await con.query<RowDataPacket[]>(findCountQuery);

        const data = findCategoryExecute.map((category) => {
          return { ...category, id: category.category_id };
        });

        const removeNullValues = isValEmptyArray(data);

        return res.status(200).json({
          status: 1,
          data: {
            data: removeNullValues,
            count: findCountExecute[0].totalCount,
            details: {},
          },
          message: "Success",
        });
      }
    } catch (error) {
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        message: "Somthing went wrong",
        error: "Somthing went wrong",
      });
    }
  }

  async DeleteCategory(req: RequestAuthType, res: Response) {
    const category_id = req.params.id;

    const deleteQuery = `DELETE FROM category WHERE category_id = ?`;

    watchLog(req);

    try {
      const [deleteCategory] = await con.query<ResultSetHeader[]>(deleteQuery, [
        category_id,
      ]);

      return res.status(200).json({
        status: 1,
        data: deleteCategory[0],
        message: "Deleted",
      });
    } catch (error) {
      return res.status(400).json({
        status: 0,

        message: "Somthing went wrong",
        error: "Somthing went wrong",
      });
    }
  }

  async AddTerms(req: RequestAuthType, res: Response) {
    const userId = req["auth"]?.userId;

    const payload = { ...req.body, term_author_id: userId };

    const { id } = req.query;

    const { insertQuery, insertParams } = insertDataQuery("terms", payload);

    const findQuery = "SELECT * FROM terms WHERE term_id = ?";

    const updateTermImage =
      "UPDATE interest_image SET i_image_term_id=? WHERE i_id=? AND i_image_author_id=?";

    watchLog(req, userId);

    try {
      const [isTermExecute] = await con.query<ResultSetHeader>(
        insertQuery,
        insertParams
      );

      if (id) {
        await con.query<ResultSetHeader>(updateTermImage, [
          isTermExecute.insertId,
          id,
          userId,
        ]);
      }

      const [findExecute] = await con.query<RowDataPacket[]>(findQuery, [
        isTermExecute.insertId,
      ]);

      return res
        .status(200)
        .json({ status: 1, data: findExecute, message: "Success" });
    } catch (error) {
      return res.status(400).json({
        status: 0,
        message: "Somthing went wrong",
        error: "Somthing went wrong",
      });
    }
  }

  async AddTribe(req: RequestAuthType, res: Response) {
    const time = Time();

    const userId = req["auth"]?.userId;

    const payload = {
      ...req.body,
      tribe_author_id: userId,
      tribe_created_at: time,
    };

    const { insertQuery, insertParams } = insertDataQuery("tribe", payload);

    const findQuery = "SELECT * FROM tribe WHERE tribe_id = ?";

    try {
      const [isTribeExecute] = await con.query<ResultSetHeader>(
        insertQuery,
        insertParams
      );

      const [findExecute] = await con.query<RowDataPacket[]>(findQuery, [
        isTribeExecute.insertId,
      ]);

      const removeNullValues = isValEmpty(findExecute[0] || {});

      return res
        .status(200)
        .json({ status: 1, data: removeNullValues, message: "Success" });
    } catch (error) {
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        message: "Something went wrong",
        error: "Something went wrong",
      });
    }
  }

  async TermsList(req: RequestAuthType, res: Response) {
    const smokingQuery = `SELECT * FROM terms WHERE term_type = 'term_smoking'`;

    const alcoholicQuery = `SELECT * FROM terms WHERE term_type = 'term_alcoholic'`;

    const childrenQuery = `SELECT * FROM terms WHERE term_type = 'term_children'`;

    const relationQuery = `SELECT * FROM terms WHERE term_type = 'term_relationship'`;

    const educationQuery = `SELECT * FROM terms WHERE term_type = 'term_education'`;

    const idealMatchQuery = `SELECT t.*,i.i_image_url
    FROM terms t
    LEFT JOIN interest_image as i ON i.i_image_term_id=t.term_id
    WHERE term_type = 'term_ideal_match'`;

    const interestQuery = `SELECT t.*,i.i_image_url
    FROM terms t
    LEFT JOIN interest_image as i ON i.i_image_term_id=t.term_id
    WHERE term_type = 'term_interest'`;

    try {
      const smokingExecute = con.query<RowDataPacket[]>(smokingQuery);

      const alcoholicExecute = con.query<RowDataPacket[]>(alcoholicQuery);

      const childrenExecute = con.query<RowDataPacket[]>(childrenQuery);

      const relationExecute = con.query<RowDataPacket[]>(relationQuery);

      const educationExecute = con.query<RowDataPacket[]>(educationQuery);

      const interestExecute = con.query<RowDataPacket[]>(interestQuery);

      const idealMatchExecute = con.query<RowDataPacket[]>(idealMatchQuery);

      const [
        smokingResult,
        alcoholicResult,
        childrenResult,
        relationResult,
        educationResult,
        interestResult,
        idealMatchResult,
      ] = await Promise.all([
        smokingExecute,
        alcoholicExecute,
        childrenExecute,
        relationExecute,
        educationExecute,
        interestExecute,
        idealMatchExecute,
      ]);

      const removeNullSmoking = isValEmptyArray(smokingResult[0]);

      const removeNullAlcoholic = isValEmptyArray(alcoholicResult[0]);

      const removeNullChildren = isValEmptyArray(childrenResult[0]);

      const removeNullRelation = isValEmptyArray(relationResult[0]);

      const removeNullEducation = isValEmptyArray(educationResult[0]);

      const removeNullInterest = isValEmptyArray(interestResult[0]);

      const removeNullIdeal = isValEmptyArray(idealMatchResult[0]);

      return res.status(200).json({
        status: 1,
        data: {
          smoking: removeNullSmoking,
          alcoholic: removeNullAlcoholic,
          children: removeNullChildren,
          relation: removeNullRelation,
          education: removeNullEducation,
          interest: removeNullInterest,
          ideal: removeNullIdeal,
        },
        message: "Success",
      });
    } catch (error) {
      return res.status(400).json({
        status: 0,
        message: "Somthing went wrong",
        error: "Somthing went wrong",
      });
    }
  }

  async UpdateTerms(req: RequestAuthType, res: Response) {
    const id = req.params.id;

    const { image_id } = req.body;

    const fieldsToUpdate = req.body;

    delete fieldsToUpdate?.image_id;

    const userId = req["auth"]?.userId;

    const { findQuery } = selectAllQuery("terms", "term_id");

    const { updateQuery, updateParams } = updateAuthFields(
      fieldsToUpdate,
      id,
      "term_id",
      "terms",
      "term_author_id",
      userId
    );

    const findImageQuery = `SELECT * FROM interest_image WHERE i_image_term_id=? AND i_image_author_id=?`;

    const updateImageQuery = `UPDATE interest_image SET i_image_term_id=? WHERE i_id=? AND i_image_author_id=?`;

    const deleteImageQuery = `DELETE FROM interest_image WHERE i_id=? AND i_image_author_id=?`;

    watchLog(req);
    try {
      if (image_id) {
        const [findImageExecute] = await con.query<RowDataPacket[]>(
          findImageQuery,
          [id, userId]
        );

        // console.log("", id, image_id, userId, findImageExecute[0].i_id, image_id);

        if (findImageExecute[0]?.i_id !== parseInt(image_id) && image_id) {
          console.log("I worked ");

          await con.query<ResultSetHeader>(deleteImageQuery, [
            findImageExecute[0]?.i_id,
            userId,
          ]);

          await con.query<ResultSetHeader>(updateImageQuery, [
            id,
            image_id,
            userId,
          ]);
        }
      }

      await con.query<ResultSetHeader>(updateQuery, updateParams);

      const [findTermExecute] = await con.query<RowDataPacket[]>(findQuery, [
        id,
      ]);

      const removeNullValues = isValEmpty(findTermExecute[0]);

      return res
        .status(200)
        .json({ status: 1, data: removeNullValues, message: "Success" });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: 0,
        message: "Something went wrong",
        error: "Something went wrong",
      });
    }
  }

  async UpdateQuestion(req: RequestAuthType, res: Response) {
    const { id } = req.params;

    const userId = req["auth"]?.userId;

    const { question_text, question_type, option_texts } = req.body;

    const payload = {
      ...req.body,
    };

    delete payload?.option_texts;

    const updateQuery = `UPDATE question SET question_text=?,question_type=?
    WHERE question_id=? AND question_author_id=?`;

    const insertOptionQuery = `INSERT INTO question_option(question_option_relation_id,question_option_text) VALUES (?,?)`;

    const deletePrevOptionQuery = `DELETE FROM question_option WHERE question_option_relation_id=?`;

    const { findQuery } = selectAllQuery("question", "question_id");

    watchLog(req);

    try {
      await con.query<ResultSetHeader>(updateQuery, [
        question_text,
        question_type,
        id,
        userId,
      ]);

      await con.query<ResultSetHeader>(deletePrevOptionQuery, [id]);

      if (option_texts && option_texts.length > 0) {
        option_texts.map(async (option: string) => {
          await con.query<ResultSetHeader>(insertOptionQuery, [id, option]);
        });
      }

      const [findExecute] = await con.query<RowDataPacket[]>(findQuery, [id]);

      return res.status(200).json({
        status: 1,
        data: findExecute,
        message: "Success",
      });
    } catch (error) {
      console.log("error", error);
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        message: "Somthing went wrong",
        error: "Somthing went wrong",
      });
    }
  }

  async UpdateOption(req: RequestAuthType, res: Response) {
    const fieldsToUpdate = req.body;

    const id = req.params.id;

    const userId = req["auth"]?.userId;

    const { findQuery } = selectAllQuery("terms", "term_id");

    const { updateQuery, updateParams } = updateAuthFields(
      fieldsToUpdate,
      id,
      "term_id",
      "terms",
      "term_author_id",
      userId
    );

    watchLog(req);

    try {
      await con.query<ResultSetHeader>(updateQuery, updateParams);

      const [findTermExecute] = await con.query<RowDataPacket[]>(findQuery, [
        id,
      ]);

      const removeNullValues = isValEmpty(findTermExecute[0]);

      return res
        .status(200)
        .json({ status: 1, data: removeNullValues, message: "Success" });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: 0,
        message: "Something went wrong",
        error: "Something went wrong",
      });
    }
  }

  async DeleteTerms(req: RequestAuthType, res: Response) {
    const userId = req["auth"]?.userId;

    const term_id = req.params.id;

    const deleteTermQuery = `DELETE FROM terms WHERE term_id = ? AND terms_author_id=?`;

    watchLog(req);

    try {
      const [deleteTermExecute] = await con.query<ResultSetHeader[]>(
        deleteTermQuery,
        [term_id, userId]
      );

      return res
        .status(200)
        .json({ status: 1, data: deleteTermExecute[0], message: "Deleted" });
    } catch (error) {
      return res.status(400).json({
        status: 0,
        message: "Somthing Went Wrong",
        error: "Something Went Wrong",
      });
    }
  }

  async DeleteBlimp(req: RequestAuthType, res: Response) {
    const { id } = req.params;

    const deleteBlimpQuery = `DELETE FROM blimp WHERE blimps_id = ?`;

    const findBlimpQuery = `SELECT * FROM blimp WHERE blimps_id=?`;

    watchLog(req);

    try {
      const [findBlimpExecute] = await con.query<ResultSetHeader[]>(
        findBlimpQuery,
        [id]
      );

      if (findBlimpExecute.length === 0) {
        return res
          .status(404)
          .json({ status: 0, data: {}, message: "No blimp found" });
      }

      await con.query<ResultSetHeader[]>(deleteBlimpQuery, [id]);

      return res.status(200).json({ status: 1, data: id, message: "Deleted" });
    } catch (error) {
      return res.status(400).json({
        status: 0,
        message: "Somthing Went Wrong",
        error: "Something Went Wrong",
      });
    }
  }


  async DeleteTribe(req: RequestAuthType, res: Response) {
    const { id } = req.params;

    const deleteTribeQuery = `DELETE FROM tribe WHERE tribe_id = ?`;

    const findTribeQuery = `SELECT * FROM tribe WHERE tribe_id=?`;

    watchLog(req);

    try {
      const [findTribeExeute] = await con.query<ResultSetHeader[]>(
        findTribeQuery,
        [id]
      );

      if (findTribeExeute.length === 0) {
        return res
          .status(404)
          .json({ status: 0, data: {}, message: "No blimp found" });
      }

      await con.query<ResultSetHeader[]>(deleteTribeQuery, [id]);

      return res.status(200).json({ status: 1, data: id, message: "Deleted" });
    } catch (error) {
      return res.status(400).json({
        status: 0,
        message: "Somthing Went Wrong",
        error: "Something Went Wrong",
      });
    }
  }

  async InsertImages(req: RequestAuthType, res: Response) {
    const userId = req["auth"]?.userId;

    const response = await uploadImage(req);

    const { to_remove } = req.query;

    const payload = { i_image_url: response, i_image_author_id: userId };

    const { insertQuery, insertParams } = insertDataQuery(
      "interest_image",
      payload
    );

    const findImageQuery = `SELECT * FROM interest_image WHERE i_id = ?`;

    const deleteImageQuery = `DELETE FROM interest_image WHERE i_id = ? AND i_image_author_id = ${userId}`;

    try {
      if (to_remove) {
        await con.query(deleteImageQuery, [to_remove]);

        return res.status(200).json({
          status: 1,
          data: to_remove,
          message: "Success",
        });
      }
      const [insertImagesExecute] = await con.query<ResultSetHeader>(
        insertQuery,
        insertParams
      );

      const [findImageExecute] = await con.query<RowDataPacket[]>(
        findImageQuery,
        [insertImagesExecute.insertId]
      );

      const removeNullImage = isValEmpty(findImageExecute[0] || {});

      return res
        .status(200)
        .json({ status: 1, data: removeNullImage, message: "Success" });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: 0,
        message: "Something went wrong",
        error: "Something went wrong",
      });
    }
  }

  async AddQuestion(req: RequestAuthType, res: Response) {
    const userId = req["auth"]?.userId;

    const time = Time();

    const { option_texts } = req.body;

    const payload = {
      ...req.body,
      question_author_id: userId,
      question_created_at: time,
    };

    delete payload.option_texts;

    const { insertQuery, insertParams } = insertDataQuery("question", payload);

    const { findQuery } = selectAllQuery("question", "question_id");

    const insertOptionQuery = `INSERT INTO question_option(question_option_relation_id,question_option_text) VALUES (?,?)`;

    watchLog(req);

    try {
      const [insertQuestionExecute] = await con.query<ResultSetHeader>(
        insertQuery,
        insertParams
      );

      option_texts.map(async (option: string) => {
        await con.query<ResultSetHeader>(insertOptionQuery, [
          insertQuestionExecute.insertId,
          option,
        ]);
      });

      const [findExecute] = await con.query<RowDataPacket[]>(findQuery, [
        insertQuestionExecute.insertId,
      ]);

      return res.status(200).json({
        status: 1,
        data: findExecute,
        message: "Success",
      });
    } catch (error) {
      console.log("error", error);
      logger.error(`${error}`);
      return res.status(400).json({
        status: 0,
        message: "Somthing went wrong",
        error: "Somthing went wrong",
      });
    }
  }
}
