import React, { useEffect } from 'react';
import { Tabs, Typography, Card } from 'antd';
import { UserOutlined, DashboardOutlined } from '@ant-design/icons';
import IntervieweeChat from './components/IntervieweeChat/IntervieweeChat';
import InterviewerDashboard from './components/InterviewerDashboard/InterviewerDashboard';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import './App.css';

const { Title } = Typography;

const App: React.FC = () => {
  const candidatesCount = useSelector((state: RootState) => state.candidates.list.length);
  const currentCandidate = useSelector((state: RootState) => state.candidates.currentCandidate);
  
  // Log app state for debugging
  useEffect(() => {
    console.log('🚀 App loaded - Candidates:', candidatesCount);
  }, [candidatesCount]);

  const tabItems = [
    {
      key: '1',
      label: (
        <span>
          <UserOutlined />
          Interviewee Chat
          {currentCandidate && <span style={{color: '#52c41a'}}> ●</span>}
        </span>
      ),
      children: <IntervieweeChat />
    },
    {
      key: '2', 
      label: (
        <span>
          <DashboardOutlined />
          Interviewer Dashboard
          {candidatesCount > 0 && (
            <span style={{
              marginLeft: 8,
              backgroundColor: '#1890ff',
              color: 'white', 
              borderRadius: 10,
              padding: '2px 6px',
              fontSize: 12
            }}>
              {candidatesCount}
            </span>
          )}
        </span>
      ),
      children: <InterviewerDashboard />
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <Card>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
          🤖 AI-Powered Interview Assistant
        </Title>
        <Tabs 
          defaultActiveKey="1" 
          size="large"
          items={tabItems}
          style={{ minHeight: 600 }}
        />
      </Card>
    </div>
  );
};

export default App;
