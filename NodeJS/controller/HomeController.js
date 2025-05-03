import express from "express";
import { Product } from "../Models/productModel.js";
import { User } from "../Models/userModel.js";
import { Order } from "../Models/orderModel.js";
import { OrderDetail } from "../Models/orderdetailModel.js";
import { Op, fn, col } from "sequelize";

const getHomePage = async (req, res) => {
    try {
        // Kiểm tra session người dùng
        if (!req.session || !req.session.user) {
            return res.redirect('/'); // Chuyển hướng nếu chưa đăng nhập
        }

        // Lấy user_id từ session và truy vấn thông tin người dùng từ database
        const userId = req.session.user.user_id;
        const user = await User.findOne({
            where: { user_id: userId },
            attributes: ['user_id', 'username', 'fullname', 'email', 'phone', 'address', 'avatar', 'role']
        });

        if (!user) {
            // Nếu không tìm thấy user, hủy session và chuyển hướng về login
            req.session.destroy();
            return res.redirect('/login');
        }

        // Lấy tham số lọc từ query
        const { filterType, startDate, endDate, quarter, year } = req.query;

        // Xác định khoảng thời gian
        let timeCondition = {};
        let dateRange = {};
        let selectedYear = year ? parseInt(year) : new Date().getFullYear();
        let selectedQuarter = quarter ? parseInt(quarter) : null;

        if (filterType === 'custom' && startDate && endDate) {
            dateRange = {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            };
            timeCondition = {
                created_at: {
                    [Op.between]: [dateRange.startDate, dateRange.endDate]
                }
            };
        } else if (filterType === 'quarter' && quarter && year) {
            const startMonth = (quarter - 1) * 3;
            dateRange = {
                startDate: new Date(year, startMonth, 1),
                endDate: new Date(year, startMonth + 3, 0)
            };
            timeCondition = {
                created_at: {
                    [Op.between]: [dateRange.startDate, dateRange.endDate]
                }
            };
        } else if (filterType === 'year' && year) {
            dateRange = {
                startDate: new Date(year, 0, 1),
                endDate: new Date(year, 11, 31)
            };
            timeCondition = {
                created_at: {
                    [Op.between]: [dateRange.startDate, dateRange.endDate]
                }
            };
        } else {
            // Mặc định: Tuần hiện tại (từ thứ Hai đến Chủ Nhật)
            const today = new Date();
            const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
            const endOfWeek = new Date(today.setDate(startOfWeek.getDate() + 6));
            dateRange = {
                startDate: startOfWeek,
                endDate: endOfWeek
            };
            timeCondition = {
                created_at: {
                    [Op.between]: [dateRange.startDate, dateRange.endDate]
                }
            };
        }

        // 1. Tính tổng doanh thu
        const totalRevenue = await Order.sum('total_price', {
            where: {
                status_payment: 'paid',
                status: { [Op.not]: 'cancelled' },
                ...timeCondition
            }
        }) || 0;

        // 2. Đếm tổng số sản phẩm
        const totalProducts = await Product.count();

        // 3. Đếm số sản phẩm đã bán
        const productsSold = await OrderDetail.sum('quantity', {
            include: [{
                model: Order,
                where: {
                    status_payment: 'paid',
                    status: { [Op.not]: 'cancelled' },
                    ...timeCondition
                }
            }]
        }) || 0;

        // 4. Đếm tổng số đơn hàng
        const totalOrders = await Order.count({
            where: timeCondition
        });

        // 5. Đếm số đơn hàng đang giao
        const ordersShipping = await Order.count({
            where: {
                status: 'shipped',
                ...timeCondition
            }
        });

        // 6. Đếm tổng số khách hàng
        const totalCustomers = await User.count({
            where: { role: 0 }
        });

        // 7. Đếm số khách hàng mới
        const newCustomers = await User.count({
            where: {
                role: 0,
                createdAt: {
                    [Op.between]: [dateRange.startDate, dateRange.endDate]
                }
            }
        });

        // 8. Dữ liệu cho biểu đồ doanh thu
        let labels = [];
        let revenueData = [];
        let weekLabels = [];
        let salesData = [];

        if (filterType === 'year') {
            const monthlyRevenue = await Order.findAll({
                attributes: [
                    [fn('MONTH', col('created_at')), 'month'],
                    [fn('SUM', col('total_price')), 'revenue']
                ],
                where: {
                    status_payment: 'paid',
                    status: { [Op.not]: 'cancelled' },
                    ...timeCondition
                },
                group: [fn('MONTH', col('created_at'))],
                order: [[fn('MONTH', col('created_at')), 'ASC']],
                raw: true
            });

            const monthlySales = await OrderDetail.findAll({
                attributes: [
                    [fn('MONTH', col('order.created_at')), 'month'],
                    [fn('SUM', col('quantity')), 'quantity']
                ],
                include: [{
                    model: Order,
                    where: {
                        status_payment: 'paid',
                        status: { [Op.not]: 'cancelled' },
                        ...timeCondition
                    }
                }],
                group: [fn('MONTH', col('order.created_at'))],
                order: [[fn('MONTH', col('order.created_at')), 'ASC']],
                raw: true
            });

            labels = Array(12).fill(0).map((_, i) => `Th${i + 1}`);
            revenueData = Array(12).fill(0);
            weekLabels = Array(12).fill(0).map((_, i) => `Th${i + 1}`);
            salesData = Array(12).fill(0);

            monthlyRevenue.forEach(item => {
                revenueData[item.month - 1] = parseFloat(item.revenue);
            });

            monthlySales.forEach(item => {
                salesData[item.month - 1] = parseInt(item.quantity);
            });
        } else if (filterType === 'quarter') {
            const monthlyRevenue = await Order.findAll({
                attributes: [
                    [fn('MONTH', col('created_at')), 'month'],
                    [fn('SUM', col('total_price')), 'revenue']
                ],
                where: {
                    status_payment: 'paid',
                    status: { [Op.not]: 'cancelled' },
                    ...timeCondition
                },
                group: [fn('MONTH', col('created_at'))],
                order: [[fn('MONTH', col('created_at')), 'ASC']],
                raw: true
            });

            const monthlySales = await OrderDetail.findAll({
                attributes: [
                    [fn('MONTH', col('order.created_at')), 'month'],
                    [fn('SUM', col('quantity')), 'quantity']
                ],
                include: [{
                    model: Order,
                    where: {
                        status_payment: 'paid',
                        status: { [Op.not]: 'cancelled' },
                        ...timeCondition
                    }
                }],
                group: [fn('MONTH', col('order.created_at'))],
                order: [[fn('MONTH', col('order.created_at')), 'ASC']],
                raw: true
            });

            const startMonth = (selectedQuarter - 1) * 3 + 1;
            labels = [startMonth, startMonth + 1, startMonth + 2].map(m => `Th${m}`);
            revenueData = Array(3).fill(0);
            weekLabels = [startMonth, startMonth + 1, startMonth + 2].map(m => `Th${m}`);
            salesData = Array(3).fill(0);

            monthlyRevenue.forEach(item => {
                const index = item.month - startMonth;
                if (index >= 0 && index < 3) {
                    revenueData[index] = parseFloat(item.revenue);
                }
            });

            monthlySales.forEach(item => {
                const index = item.month - startMonth;
                if (index >= 0 && index < 3) {
                    salesData[index] = parseInt(item.quantity);
                }
            });
        } else {
            const dailyRevenue = await Order.findAll({
                attributes: [
                    [fn('DATE', col('created_at')), 'date'],
                    [fn('SUM', col('total_price')), 'revenue']
                ],
                where: {
                    status_payment: 'paid',
                    status: { [Op.not]: 'cancelled' },
                    ...timeCondition
                },
                group: [fn('DATE', col('created_at'))],
                order: [[fn('DATE', col('created_at')), 'ASC']],
                raw: true
            });

            const dailySales = await OrderDetail.findAll({
                attributes: [
                    [fn('DATE', col('order.created_at')), 'date'],
                    [fn('SUM', col('quantity')), 'quantity']
                ],
                include: [{
                    model: Order,
                    where: {
                        status_payment: 'paid',
                        status: { [Op.not]: 'cancelled' },
                        ...timeCondition
                    }
                }],
                group: [fn('DATE', col('order.created_at'))],
                order: [[fn('DATE', col('order.created_at')), 'ASC']],
                raw: true
            });

            dailyRevenue.forEach(item => {
                labels.push(new Date(item.date).toLocaleDateString('vi-VN'));
                revenueData.push(parseFloat(item.revenue));
            });

            dailySales.forEach(item => {
                weekLabels.push(new Date(item.date).toLocaleDateString('vi-VN'));
                salesData.push(parseInt(item.quantity));
            });
        }

        // 9. Lấy top 5 sản phẩm mới được thêm vào (dựa trên product_id)
        const topProducts = await Product.findAll({
            attributes: [
                'name',
                'product_id'
            ],
            order: [['product_id', 'DESC']],
            limit: 5,
            raw: true
        });

        // 10. Lấy top 5 sản phẩm được xem nhiều nhất
        const topViewedProducts = await Product.findAll({
            attributes: [
                'name',
                'views'
            ],
            order: [['views', 'DESC']],
            limit: 5,
            raw: true
        });

        // Render giao diện
        return res.render('home', {
            data: {
                title: 'Tổng quan hệ thống',
                page: 'main',
                user: user.dataValues,
                stats: {
                    revenue: totalRevenue,
                    totalProducts,
                    productsSold,
                    totalOrders,
                    ordersShipping,
                    totalCustomers,
                    newCustomers
                },
                chartData: {
                    labels: labels.length ? labels : ['Không có dữ liệu'],
                    revenue: revenueData.length ? revenueData : [0],
                    weekLabels: weekLabels.length ? weekLabels : ['Không có dữ liệu'],
                    sales: salesData.length ? salesData : [0]
                },
                dateRange,
                filterType: filterType || 'week',
                quarter: quarter || '',
                year: selectedYear,
                topProducts,
                topViewedProducts
            }
        });
    } catch (error) {
        console.error('Error in getHomePage:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

export default getHomePage;