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
import { Modal } from 'antd';
import { useDispatch } from 'react-redux';
import { resumeInterview, pauseInterview, resetInterview } from './store/interviewSlice';
const { Title } = Typography;

const App: React.FC = () => {
  const dispatch = useDispatch();
  const candidatesCount = useSelector((state: RootState) => state.candidates.list.length);
  const currentCandidate = useSelector((state: RootState) => state.candidates.currentCandidate);

  // 🔧 FIX: Add controlled tab state
  const [activeTab, setActiveTab] = useState('1');

  // 🆕 Welcome Back Modal State
const [showWelcomeBack, setShowWelcomeBack] = useState(false);
const [hasCheckedSession, setHasCheckedSession] = useState(false);

  // 🔧 FIX: Auto-switch to Interview Manager when interview starts
  const isInterviewActive = useSelector((state: RootState) => state.interview.isActive);
  const interviewSession = useSelector((state: RootState) => state.interview); // 🆕 Full interview state

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

    // 🆕 WELCOME BACK MODAL: Check for active session after reload
  useEffect(() => {
    if (hasCheckedSession) return;
    
    // 200ms delay ensures Redux Persist has rehydrated
    const checkTimer = setTimeout(() => {
      const hasActiveSession = 
        interviewSession.currentSession !== null &&
        interviewSession.isActive === true &&
        interviewSession.currentSession.status === 'in-progress' &&
        interviewSession.currentSession.currentQuestionIndex < interviewSession.currentSession.questions.length;
      
      if (hasActiveSession) {
        console.log('🔄 [APP] Active session detected after reload - showing Welcome Back modal');
        setShowWelcomeBack(true);
      } else {
        console.log('✅ [APP] No active session to restore');
      }
      
      setHasCheckedSession(true);
    }, 200);
    
    return () => clearTimeout(checkTimer);
  }, [hasCheckedSession, interviewSession]);

  // 🆕 WELCOME BACK MODAL: Handler Functions
  const handleResumeInterview = () => {
    console.log('▶️ [APP] User chose to resume interview');
    setShowWelcomeBack(false);
    dispatch(resumeInterview());
    setActiveTab('4'); // Navigate to Interview Manager
  };

{/*  const handleReturnHome = () => {
    console.log('🏠 [APP] User chose to return to home');
    setShowWelcomeBack(false);
    dispatch(resetInterview());
    setActiveTab('1'); // Navigate to Interviewee Chat
  };}
*/}
  const tabItems = [
    {
      key: '1',
      label: (
        <span>
          <UserOutlined />
          Interviewee Chat {currentCandidate && `(${currentCandidate.name})`}
        </span>
      ),
      children: <IntervieweeChat />
    },
    {
      key: '2',
      label: (
        <span>
          <DashboardOutlined />
          Candidate Dashboard ({candidatesCount})
        </span>
      ),
      children: <InterviewerDashboard />
    },
    {
      key: '3',
      label: (
        <span>
          <BarChartOutlined />
          Analytics Dashboard
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
    <div className="App">
      {/* 🆕 WELCOME BACK MODAL */}
      <Modal
        open={showWelcomeBack}
        title="🎯 Welcome Back!"
        closable={false}
        okText="Resume Interview"
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={handleResumeInterview}
        width={500}
      >
        <p style={{ fontSize: 16, marginBottom: 16 }}>
          Your interview session was interrupted. Would you like to continue where you left off?
        </p>
        <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 8 }}>
          <p><strong>Candidate:</strong> {interviewSession.currentSession?.candidateName}</p>
          <p><strong>Subject:</strong> {interviewSession.currentSession?.subject}</p>
          <p><strong>Progress:</strong> Question {(interviewSession.currentSession?.currentQuestionIndex || 0) + 1} of {interviewSession.currentSession?.questions.length}</p>
          <p><strong>Status:</strong> {interviewSession.currentSession?.status}</p>
        </div>
      </Modal>

      <Card style={{ margin: 20 }}>
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
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>
    </div>
  );
};

export default App;
