// Print order detail page — full print order info with status tracking

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PrintOrderDetail from '../components/orders/PrintOrderDetail';
import Loader from '../components/common/Loader';
import { getPrintOrder } from '../services/printService';

const PrintOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await getPrintOrder(id);
        setOrder(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Print order not found');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) return <Loader text="Loading print order..." />;
  if (error) return <div className="page-container"><div className="error-banner">{error}</div></div>;
  if (!order) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title">Print Order Details</h2>
      </div>
      <PrintOrderDetail order={order} />
    </div>
  );
};

export default PrintOrderDetailPage;
