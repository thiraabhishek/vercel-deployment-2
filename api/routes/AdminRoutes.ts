import express from 'express'
import AdminModel from "../services/AdminService"
import {adminAuthentication} from '../middlewares/UserAuthentication'


const admin = express.Router({ strict: true })
const adminModel = new AdminModel()

admin.post('/admin/signup', adminModel.AdminSignup)
admin.post('/admin/login', adminModel.AdminLogin)
admin.get('/admin/table/list',adminAuthentication, adminModel.AllTableLists)
//.......................Delete....................... 



export default admin