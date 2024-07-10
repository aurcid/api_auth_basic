import db from '../dist/db/models/index.js';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

const createUser = async (req) => {
    const {
        name,
        email,
        password,
        password_second,
        cellphone
    } = req.body;
    if (password !== password_second) {
        return {
            code: 400,
            message: 'Passwords do not match'
        };
    }
    const user = await db.User.findOne({
        where: {
            email: email
        }
    });
    if (user) {
        return {
            code: 400,
            message: 'User already exists'
        };
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.User.create({
        name,
        email,
        password: encryptedPassword,
        cellphone,
        status: true
    });
    return {
        code: 200,
        message: 'User created successfully with ID: ' + newUser.id,
    }
};

const getUserById = async (id) => {
    return {
        code: 200,
        message: await db.User.findOne({
            where: {
                id: id,
                status: true,
            }
        })
    };
}

const updateUser = async (req) => {
    const user = db.User.findOne({
        where: {
            id: req.params.id,
            status: true,
        }
    });
    const payload = {};
    payload.name = req.body.name ?? user.name;
    payload.password = req.body.password ? await bcrypt.hash(req.body.password, 10) : user.password;
    payload.cellphone = req.body.cellphone ?? user.cellphone;
    await db.User.update(payload, {
        where: {
            id: req.params.id
        }

    });
    return {
        code: 200,
        message: 'User updated successfully'
    };
}

const deleteUser = async (id) => {
    /* await db.User.destroy({
        where: {
            id: id
        }
    }); */
    const user = db.User.findOne({
        where: {
            id: id,
            status: true,
        }
    });
    await  db.User.update({
        status: false
    }, {
        where: {
            id: id
        }
    });
    return {
        code: 200,
        message: 'User deleted successfully'
    };
}

const getAllActiveUsers = async () => {
    const users = await db.User.findAll({
        where: {
            status: true
        }
    })

    return {
        code: users.length > 0 ? 200: 404,
        message: users.length > 0 ? 
        users: 
        {
            code: 404, 
            message: 'No active users found'
        }
    };
}

const getAllFilteredUsers = async (req) => {
    if (Object.keys(req.query).length === 0) {
        return {
            code: 400,
            message: {
                code: 400, 
                message: 'No search parameters'
            }
        };
    }

    const { status, name, login_before, login_after } = req.query;
    const where_users = {};
    const where_sessions = {};

    if (status !== undefined) {
        where_users.status = (status.toLowerCase() === 'true' || status.toLowerCase() === '1');
    }
    
    if (name) {
        where_users.name = {
            [Op.substring]: name
        };
    }

    if (login_before) {
        const format_date = new Date(login_before);
        format_date.setUTCHours(23, 59, 59, 999);

        where_sessions.createdAt = {
            [Op.lte]: format_date
        };
    }

    if (login_after) {
        const format_date = new Date(login_after);
        format_date.setUTCHours(0, 0, 0, 0);

        if (where_sessions.createdAt?.[Op.lte]) {
            where_sessions.createdAt[Op.or] = {
                [Op.lte]: where_sessions.createdAt[Op.lte],
                [Op.gte]: format_date
            }
            delete where_sessions.createdAt[Op.lte];
        } else {
            where_sessions.createdAt = {
                [Op.gte]: format_date
            };
        }
    }

    const join_type = Object.keys(where_users).length === 0;
    
    const users = await db.User.findAll({
        where: {
            ...where_users
        },
        include: {
            model: db.Session,
            required: join_type,
            attributes: [],
            where: {
                ...where_sessions
            }
        }
    });

    return {
        code: users.length > 0 ? 200: 404,
        message: users.length > 0 ? 
        users: 
        {
            code: 404, 
            message: 'No results for this search'
        }
    };
}

export default {
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    getAllActiveUsers,
    getAllFilteredUsers,
}