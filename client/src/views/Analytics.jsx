import React, { useEffect, useState } from 'react';
import apiService from '../services/apiService';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { FaArrowLeft, FaArrowRight, FaBullseye } from 'react-icons/fa';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const Analytics = () => {
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [monthlyData, setMonthlyData] = useState(null);
    const [yearlyMetrics, setYearlyMetrics] = useState([]);
    const [yearlyMonthlyMetrics, setYearlyMonthlyMetrics] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [category, setCategory] = useState('orders');
    const [targetGoal, setTargetGoal] = useState(0);
    const [yearEndReport, setYearEndReport] = useState(null); // For yearly report
    const monthName = new Date(0, currentMonth - 1).toLocaleString('default', { month: 'long' });

    useEffect(() => {
        const savedGoal = localStorage.getItem('targetGoal');
        if (savedGoal) setTargetGoal(parseInt(savedGoal, 10));
    }, []);

    // Fetch single-month metrics
    useEffect(() => {
        const fetchMonthlyData = async () => {
            try {
                const response = await apiService.getSingleMonthMetrics(currentYear, currentMonth);
                setMonthlyData(response.data || { monthly_metrics: {}, new_clients: 0 });
            } catch (error) {
                console.error('Error fetching single-month metrics:', error);
                setMonthlyData({ monthly_metrics: {}, new_clients: 0 });
            }
        };
        fetchMonthlyData();
    }, [currentYear, currentMonth]);

    // Fetch yearly metrics for the selected year
    useEffect(() => {
        const fetchYearlyMetrics = async () => {
            try {
                const response = await apiService.getYearlyMetrics(currentYear);
                setYearlyMetrics(response.data.yearly_metrics || []);
            } catch (error) {
                console.error('Error fetching yearly metrics:', error);
                setYearlyMetrics([]);
            }
        };
        fetchYearlyMetrics();
    }, [currentYear]);

    // Fetch monthly metrics for the whole year for comparison
    useEffect(() => {
        const fetchYearlyMonthlyMetrics = async () => {
            try {
                const response = await apiService.getMonthlyMetrics(currentYear);
                const monthlyMetrics = response.data.monthly_metrics || [];
                setYearlyMonthlyMetrics(monthlyMetrics);

                // Check if December (month 12) data is available for the year-end report
                const decemberData = monthlyMetrics.find(m => m.month === 12);
                if (decemberData) {
                    // Aggregate year data
                    const totalGrossSales = monthlyMetrics.reduce((sum, m) => sum + Number(m.gross_sales || 0), 0);
                    const totalRevenue = monthlyMetrics.reduce((sum, m) => sum + Number(m.revenue_earned || 0), 0);
                    const totalNetSales = monthlyMetrics.reduce((sum, m) => sum + Number(m.net_sales || 0), 0);


                    // If you have product cost data separately, incorporate it here. For now, we assume 'revenue_earned' is already profit after cost.
                    setYearEndReport({
                        totalGrossSales,
                        totalRevenue,
                        totalNetSales,
                        year: currentYear
                    });
                } else {
                    setYearEndReport(null);
                }
            } catch (error) {
                console.error('Error fetching yearly monthly metrics:', error);
                setYearlyMonthlyMetrics([]);
                setYearEndReport(null);
            }
        };
        fetchYearlyMonthlyMetrics();
    }, [currentYear]);

    // Fetch top products
    useEffect(() => {
        const fetchTopProducts = async () => {
            try {
                const response = await apiService.getTopProducts(currentYear, currentMonth, category);
                setTopProducts(response.data.top_products || []);
            } catch (error) {
                console.error('Error fetching top products:', error);
                setTopProducts([]);
            }
        };
        fetchTopProducts();
    }, [currentYear, currentMonth, category]);

    const handleMonthChange = (direction) => {
        const newMonth = currentMonth + direction;
        if (newMonth < 1) {
            setCurrentMonth(12);
            setCurrentYear(currentYear - 1);
        } else if (newMonth > 12) {
            setCurrentMonth(1);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(newMonth);
        }
    };

    const handleYearChange = (direction) => {
        setCurrentYear(prev => prev + direction);
    };

    const handleSetGoal = (e) => {
        e.preventDefault();
        localStorage.setItem('targetGoal', targetGoal);
        alert('Target goal saved locally! Note: Clearing your browsing data will remove it.');
    };

    const monthlyMetrics = monthlyData?.monthly_metrics || {};
    const newClients = monthlyData?.new_clients || 0;

    // Single-month bar chart
    const monthlyChartData = {
        labels: [`${monthName} ${currentYear}`],
        datasets: [
            {
                label: 'Gross Sales',
                data: [monthlyMetrics.gross_sales || 0],
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                maxBarThickness: 50,
            },
            {
                label: 'Revenue Earned',
                data: [monthlyMetrics.revenue_earned || 0],
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                maxBarThickness: 50,
            },
            {
                label: 'Net Sales',
                data: [monthlyMetrics.net_sales || 0],
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                maxBarThickness: 50,
            },
        ]
    };

    // New Clients Donut Chart (single-slice)
    const clientsDoughnutData = {
        labels: ['New Clients'],
        datasets: [{
            data: [newClients],
            backgroundColor: ['rgba(255, 159, 64, 0.6)'],
            borderWidth: 1
        }]
    };

    // Yearly bar chart (just for the selected year)
    const yearlyLabels = yearlyMetrics.map(y => y.year);
    const yearlyChartData = {
        labels: yearlyLabels,
        datasets: [
            {
                label: 'Gross Sales',
                data: yearlyMetrics.map(y => y.gross_sales),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                maxBarThickness: 50,
            },
            {
                label: 'Revenue Earned',
                data: yearlyMetrics.map(y => y.revenue_earned),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                maxBarThickness: 50,
            },
            {
                label: 'Net Sales',
                data: yearlyMetrics.map(y => y.net_sales),
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                maxBarThickness: 50,
            },
        ]
    };

    // Monthly comparison line chart (for currentYear)
    const monthsInYear = Array.from({ length: 12 }, (_, i) => i + 1);
    const monthlyComparisonValues = monthsInYear.map(m => {
        const dataForMonth = yearlyMonthlyMetrics.find(item => item.month === m);
        return dataForMonth ? dataForMonth.gross_sales : 0;
    });
    const monthlyComparisonData = {
        labels: monthsInYear.map(m => new Date(0, m - 1).toLocaleString('default', { month: 'short' })),
        datasets: [
            {
                label: `Gross Sales Over ${currentYear}`,
                data: monthlyComparisonValues,
                borderColor: 'rgba(255,99,132,1)',
                backgroundColor: 'rgba(255,99,132,0.2)',
                tension: 0.2,
                pointRadius: 5,
                pointHoverRadius: 7,
            }
        ]
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>

            <p className="mb-4 text-gray-700">
                Welcome! Use the arrows to navigate between different years and months. The charts below show your monthly and yearly metrics, including gross sales, revenue earned, and net sales.
                The donut chart shows the number of new clients this month, and the line chart helps you compare sales across all months in the year.
            </p>
            <p className="mb-4 text-gray-700">
                <strong>Gross Sales</strong> = Total amount from all sales<br />
                <strong>Revenue Earned</strong> = Gross Sales - (Your cost of products)<br />
                <strong>Net Sales</strong> = Fully paid amount<br />
                <strong>New Clients</strong> = New clients this month
            </p>

            {/* Navigation */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                    <button onClick={() => handleYearChange(-1)} className="p-2 bg-gray-200 hover:bg-gray-300 rounded">
                        <FaArrowLeft />
                    </button>
                    <h2 className="text-lg font-semibold">{currentYear}</h2>
                    <button onClick={() => handleYearChange(1)} className="p-2 bg-gray-200 hover:bg-gray-300 rounded">
                        <FaArrowRight />
                    </button>
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={() => handleMonthChange(-1)} className="p-2 bg-gray-200 hover:bg-gray-300 rounded">
                        <FaArrowLeft />
                    </button>
                    <h2 className="text-lg font-semibold">{monthName}</h2>
                    <button onClick={() => handleMonthChange(1)} className="p-2 bg-gray-200 hover:bg-gray-300 rounded">
                        <FaArrowRight />
                    </button>
                </div>
            </div>

            {/* Monthly Metrics Chart */}
            <div className="bg-white p-6 rounded-lg shadow mb-6" style={{ maxWidth: '800px' }}>
                <h3 className="text-lg font-bold mb-4">Monthly Metrics for {monthName} {currentYear}</h3>
                {monthlyData?.monthly_metrics ? (
                    <Bar
                        data={monthlyChartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            aspectRatio: 2,
                            scales: { x: { stacked: false }, y: { stacked: false } },
                            plugins: { legend: { position: 'bottom' } }
                        }}
                    />
                ) : (
                    <p className="text-gray-500">No data available for {monthName} {currentYear}.</p>
                )}
            </div>

            {/* New Clients Donut Chart */}
            <div className="bg-white p-6 rounded-lg shadow mb-6" style={{ maxWidth: '400px' }}>
                <h3 className="text-lg font-bold mb-4">New Clients in {monthName} {currentYear}</h3>
                {typeof newClients === 'number' ? (
                    <Doughnut
                        data={clientsDoughnutData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            aspectRatio: 1.5,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: () => `New Clients: ${newClients}`
                                    }
                                }
                            }
                        }}
                    />
                ) : (
                    <p className="text-gray-500">No client data available for {monthName} {currentYear}.</p>
                )}
            </div>

            {/* Monthly Comparison Line Chart (for the entire year) */}
            <div className="bg-white p-6 rounded-lg shadow mb-6" style={{ maxWidth: '800px' }}>
                <h3 className="text-lg font-bold mb-4">Monthly Sales Comparison for {currentYear}</h3>
                {yearlyMonthlyMetrics.length ? (
                    <Line
                        data={monthlyComparisonData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            aspectRatio: 2,
                            plugins: { legend: { position: 'bottom' } },
                            scales: {
                                x: { title: { display: true, text: 'Month' } },
                                y: { title: { display: true, text: 'Gross Sales' } }
                            }
                        }}
                    />
                ) : (
                    <p className="text-gray-500">No monthly data for comparison.</p>
                )}
            </div>

            {/* Yearly Metrics Chart (for the selected year) */}
            <div className="bg-white p-6 rounded-lg shadow mb-6" style={{ maxWidth: '800px' }}>
                <h3 className="text-lg font-bold mb-4">Yearly Overview for {currentYear}</h3>
                {yearlyMetrics.length ? (
                    <Bar
                        data={yearlyChartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            aspectRatio: 2,
                            scales: { x: { stacked: false }, y: { stacked: false } },
                            plugins: { legend: { position: 'bottom' } }
                        }}
                    />
                ) : (
                    <p className="text-gray-500">No yearly data available for {currentYear}.</p>
                )}
            </div>

            {/* Year-End Report (only if December data is available) */}
            {yearEndReport && (
                <div className="bg-white p-6 rounded-lg shadow mb-6 max-w-xl">
                    <h3 className="text-lg font-bold mb-4">Year-End Report for {yearEndReport.year}</h3>
                    <p className="mb-2">Total Gross Sales: ${yearEndReport.totalGrossSales.toFixed(2)}</p>
                    <p className="mb-2">Total Revenue Earned: ${yearEndReport.totalRevenue.toFixed(2)}</p>
                    <p className="mb-2">Total Net Sales: ${yearEndReport.totalNetSales.toFixed(2)}</p>
                    <p className="text-gray-600">
                        This yearly report is available because December data exists, providing a complete picture of the year.
                    </p>
                </div>
            )}

            {/* Top Products */}
            <div className="bg-white p-6 rounded-lg shadow mt-6">
                <h3 className="text-lg font-bold mb-4">
                    Top Products for {monthName} {currentYear}
                </h3>
                <p className="text-gray-700 mb-4">
                    View top products by <strong>Orders</strong> or <strong>Sales</strong>.
                </p>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="border rounded px-2 py-1 text-sm mb-4"
                >
                    <option value="orders">Most Popular by Orders</option>
                    <option value="sales">Most Popular by Sales</option>
                </select>

                {topProducts.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {topProducts.map((product, idx) => (
                            <div key={idx} className="border rounded-lg p-4 bg-gray-50 shadow-sm flex flex-col items-start">
                                {product.product_screenshot_photo && (
                                    <img
                                        src={product.product_screenshot_photo}
                                        alt={product.product_name || 'Product'}
                                        className="mb-2 w-20 h-20 object-cover rounded"
                                    />
                                )}
                                <div className="font-bold text-lg mb-1">
                                    {product.product_name || 'Unnamed Product'}
                                </div>
                                <div className="text-sm text-gray-700">
                                    Orders: {product.total_orders}
                                </div>
                                <div className="text-sm text-gray-700">
                                    Total Sales: {product.total_sales > 0 ? `$${product.total_sales.toFixed(2)}` : '$0.00'}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No top products for {monthName} {currentYear}.</p>
                )}
            </div>

            {/* Target Goals */}
            <div className="bg-white p-6 rounded-lg shadow mt-6" style={{ maxWidth: '1000px' }}>
                <h3 className="text-lg font-bold mb-4">Set Target Goals</h3>
                <p className="mb-4 text-gray-700">
                    Enter a target goal. This is currently stored locally in your browser.
                    Clearing your browsing data will remove it. For a more permanent solution, consider saving to a database.
                </p>
                <form onSubmit={handleSetGoal}>
                    <input
                        type="number"
                        value={targetGoal}
                        onChange={(e) => setTargetGoal(e.target.value)}
                        className="p-2 border border-gray-300 rounded w-full mb-4"
                        placeholder="Enter target goal"
                    />
                    <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center">
                        <FaBullseye className="mr-2" /> Set Goal
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Analytics;
