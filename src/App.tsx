import React, { useEffect, useState } from 'react';
import { Tabs, Typography, Card } from 'antd';
import { UserOutlined, DashboardOutlined, RocketOutlined, BarChartOutlined } from '@ant-design/icons';
import IntervieweeChat from './components/IntervieweeChat/IntervieweeChat';
import InterviewerDashboard from './components/InterviewerDashboard/InterviewerDashboard';
import InterviewManager from './components/InterviewManager/InterviewManager';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import './App.css';

const { Title } = Typography;

const App: React.FC = () => {
  const candidatesCount = useSelector((state: RootState) => state.candidates.list.length);
  const currentCandidate = useSelector((state: RootState) => state.candidates.currentCandidate);

  // 🔧 FIX: Add controlled tab state
  const [activeTab, setActiveTab] = useState('1');

  // 🔧 FIX: Auto-switch to Interview Manager when interview starts
  const isInterviewActive = useSelector((state: RootState) => state.interview.isActive);

  useEffect(() => {
    console.log('🚀 App loaded - Candidates:', candidatesCount);
  }, [candidatesCount]);

  // 🔧 FIX: Auto-navigate to Interview Manager tab when interview starts
  useEffect(() => {
    if (isInterviewActive) {
      console.log('✅ [APP] Interview started, switching to Interview Manager tab');
      setActiveTab('4'); // Switch to Interview Manager tab
    }
  }, [isInterviewActive]);

  // ✅ FIX #5: Listen for completion event and switch back to Interviewee Chat
  useEffect(() => {
    const handleTabSwitch = (e: any) => {
      console.log('🔄 [APP] Interview completed, switching to Interviewee Chat tab');
      setActiveTab('1'); // Tab key '1' = Interviewee Chat
    };
    
    window.addEventListener('switchToIntervieweeTab', handleTabSwitch as EventListener);
    
    return () => {
      window.removeEventListener('switchToIntervieweeTab', handleTabSwitch as EventListener);
    };
  }, []);

  const tabItems = [
    {
      key: '1',
      label: (
        <span>
          <UserOutlined />
          Interviewee Chat
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
        </span>
      ),
      children: <InterviewerDashboard />
    },
    {
      key: '3',
      label: (
        <span>
          <BarChartOutlined />
          Analytics
        </span>
      ),
      children: <AnalyticsDashboard />
    },
    {
      key: '4',
      label: (
        <span>
          <RocketOutlined />
          Interview Manager
        </span>
      ),
      children: <InterviewManager />
    }
  ];

  return (
    <div className="app-container">
      <Card className="app-header" bordered={false}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 64 }}>
          <Title level={2} style={{ margin: 0, textAlign: 'center', width: '100%' }}>
            SWIPE ASSIST - Your AI-Powered Interview Assistant
          </Title>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
          <Typography.Text type="secondary">
            Powered by Gemini 2.5 Flash Model
          </Typography.Text>
        </div>
      </Card>
      
      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        style={{ padding: '0 24px' }}
      />
    </div>
  );
};

export default App;
