import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Button, 
  Input, 
  Progress, 
  Typography, 
  Space, 
  Modal, 
  message, 
  Alert,
  Tag,
  Divider 
} from 'antd';
import { 
  ClockCircleOutlined, 
  SendOutlined, 
  PauseOutlined, 
  PlayCircleOutlined,
  CheckCircleOutlined 
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  submitAnswer, 
  updateTimer, 
  completeInterview, 
  pauseInterview, 
  resumeInterview 
} from '../../store/interviewSlice';
import { geminiService } from '../../services/geminiService';
import { updateCandidate } from '../../store/candidatesSlice';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;


const InterviewManager: React.FC = () => {
  const dispatch = useDispatch();
  const { currentSession, isActive, isPaused } = useSelector(
    (state: RootState) => state.interview
  );
  
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [wasPasted, setWasPasted] = useState(false);
  const [pasteCount, setPasteCount] = useState(0);  

  // Timer effect - ENHANCED
  useEffect(() => {
    if (isActive && !isPaused && currentSession && currentSession.timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        const newTime = currentSession.timeRemaining - 1;
        dispatch(updateTimer(newTime));
        
        if (newTime === 0) {
          handleTimeUp();
        }
      }, 1000);
    } else {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, isPaused, currentSession?.timeRemaining, dispatch]);


  useEffect(() => {
  const handleSwitchTab = () => {
    setActiveTab('1'); // Switch to Interviewee Chat
  };
  
  window.addEventListener('switchToIntervieweeTab', handleSwitchTab);
  
  return () => {
    window.removeEventListener('switchToIntervieweeTab', handleSwitchTab);
  };
}, []);

  const handleTimeUp = async () => {
    message.warning('⏰ Time is up! Auto-submitting your answer.');
    if (!answer.trim()) {
      setAnswer('Time expired - No answer provided');
    }
    await submitCurrentAnswer();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    setWasPasted(true);
    setPasteCount(prev => prev + 1);
    
    message.warning({
        content: '⚠️ Paste detected! This will be flagged in your submission.',
        duration: 3
    });
    
    console.log('🚨 [CHEATING] Paste detected for question:', currentSession?.currentQuestionIndex);
    };

  const handleSubmitAnswer = () => {
    if (!answer.trim()) {
      message.error('Please provide an answer before submitting.');
      return;
    }
    setShowSubmitModal(true);
  };

const submitCurrentAnswer = async () => {
  if (!currentSession) return;
  
  console.log('📝 [SUBMIT] Starting submission process...');
  console.log('   Current question index:', currentSession.currentQuestionIndex);
  console.log('   Total questions:', currentSession.questions.length);
  
  // ✅ CRITICAL: Calculate this BEFORE any async operations
  const isLastQuestion = currentSession.currentQuestionIndex + 1 >= currentSession.questions.length;
  console.log('   Is last question?', isLastQuestion);
  
  // ✅ FREEZE TIMER IMMEDIATELY
  setIsSubmitting(true);
  setShowSubmitModal(false);
  
  // ✅ Stop the timer by pausing interview
  dispatch(pauseInterview());
  
  // ✅ Show submission feedback
  message.loading({
    content: '⏳ Submitting your answer and calculating score...',
    key: 'submitAnswer',
    duration: 0
  });

  try {
    const currentQuestion = currentSession.questions[currentSession.currentQuestionIndex];

    // Get AI score
    const score = await geminiService.scoreAnswer(
      currentQuestion.question,
      answer.trim(),
      currentQuestion.difficulty,
      currentQuestion.subject
    );

    const answerData = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      answer: answer.trim(),
      score,
      timeUsed: currentQuestion.timeLimit - currentSession.timeRemaining,
      maxTime: currentQuestion.timeLimit,
      timestamp: new Date().toISOString(),
      wasPasted: wasPasted, 
      pasteCount: pasteCount 
    };
    
    setWasPasted(false);
    setPasteCount(0);

    // Submit answer to Redux
    dispatch(submitAnswer(answerData));
    
    // ✅ Resume timer for next question (ONLY if not last)
    if (!isLastQuestion) {
      dispatch(resumeInterview());
    }
    
    setAnswer('');

    // ✅ Dismiss loading and show success
    message.destroy('submitAnswer');
    
    const scoreMessage = score >= 80 ? 'Excellent answer! 🌟' :
      score >= 60 ? 'Good answer! 👍' :
      score >= 40 ? 'Fair answer. 👌' : 'Needs improvement. 💪';

    message.success(`${scoreMessage} Score: ${score}/100`, 3);

    // ✅ CRITICAL: Handle completion BEFORE finally block
    if (isLastQuestion) {
      console.log('🎯 [COMPLETION] This was the LAST question!');
      console.log('   Preparing to complete interview...');
      
      const allAnswers = [...currentSession.answers, answerData];
      const finalTotalScore = allAnswers.reduce((sum, ans) => sum + ans.score, 0);
      const finalAverageScore = Math.round(finalTotalScore / allAnswers.length);

      console.log('   Final score:', finalAverageScore);
      console.log('   Total answers:', allAnswers.length);

      // ✅ Wait for score message to show, then complete
      setTimeout(() => {
        console.log('✅ [COMPLETION] Dispatching completeInterview action...');
        dispatch(completeInterview());
        
        if (currentSession.candidateId) {
          console.log('✅ [COMPLETION] Updating candidate record...');
          dispatch(updateCandidate({
            id: currentSession.candidateId,
            updates: {
              status: 'completed',
              totalScore: finalAverageScore,
              answers: allAnswers,
              completedAt: new Date().toISOString()
            }
          }));
        }

        console.log('🎉 [COMPLETION] Showing completion modal...');
        
        // ✅ SHOW COMPLETION MODAL
        Modal.success({
          title: '🎉 Interview Completed Successfully!',
          content: (
            <div style={{ padding: '10px 0' }}>
              <p style={{ fontSize: 15, marginBottom: 16 }}>
                <strong>Congratulations!</strong> You have successfully completed the interview.
              </p>
              
              <Divider style={{ margin: '12px 0' }} />
              
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong>📊 Final Score:</Text>
                  <Tag color={finalAverageScore >= 80 ? 'green' : finalAverageScore >= 60 ? 'blue' : 'orange'} 
                       style={{ fontSize: 18, padding: '4px 12px' }}>
                    {finalAverageScore}/100
                  </Tag>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>📝 Questions Answered:</Text>
                  <Text strong>{allAnswers.length}/6</Text>
                </div>
              </Space>
              
              <Divider style={{ margin: '12px 0' }} />
              
              <p style={{ color: '#52c41a', fontSize: 15, marginBottom: 8 }}>
                ✨ <strong>Thank you for attending the interview!</strong>
              </p>
              <p style={{ color: '#666', fontSize: 13, marginBottom: 0 }}>
                Your responses have been saved and will be reviewed by our team. We will contact you soon regarding the next steps.
              </p>
            </div>
          ),
          width: 550,
          okText: 'Finish',
          centered: true,
          maskClosable: false,
          keyboard: false,
          onOk: () => {
            console.log('✅ [REDIRECT] User clicked Finish - Switching to Interviewee Chat');
            window.dispatchEvent(new CustomEvent('switchToIntervieweeTab'));
          },
          onCancel: () => {
            console.log('✅ [REDIRECT] Modal closed - Switching to Interviewee Chat');
            window.dispatchEvent(new CustomEvent('switchToIntervieweeTab'));
          }
        });
      }, 1500); // Wait 1.5s for score message
    }

  } catch (error) {
    // ✅ ERROR HANDLING
    message.destroy('submitAnswer');
    console.error('❌ [ERROR] Failed to submit answer:', error);
    message.error('Failed to submit answer. Please try again.');
    
    // Resume timer on error
    dispatch(resumeInterview());
    
  } finally {
    // ✅ ONLY reset isSubmitting if NOT last question
    // (Last question keeps button disabled permanently)
    if (!isLastQuestion) {
      setIsSubmitting(false);
    } else {
      console.log('🔒 [COMPLETION] Keeping submit button disabled (interview completed)');
    }
  }
};
  const handlePauseResume = () => {
    if (isPaused) {
      dispatch(resumeInterview());
      message.info('Interview resumed ▶️');
    } else {
      dispatch(pauseInterview());
      message.info('Interview paused ⏸️');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'green';
      case 'medium': return 'orange';
      case 'hard': return 'red';
      default: return 'blue';
    }
  };

  if (!currentSession || !isActive) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Title level={4}>🚀 Interview Manager</Title>
          <Text type="secondary">
            Start an interview from the "Start Interview Now" button in the Interviewee Chat tab.
          </Text>
        </div>
      </Card>
    );
  }

  const currentQuestion = currentSession.questions[currentSession.currentQuestionIndex];
  const progressPercent = ((currentSession.currentQuestionIndex + 1) / currentSession.questions.length) * 100;
  const isTimeWarning = currentSession.timeRemaining <= 30;
  const isTimeCritical = currentSession.timeRemaining <= 10;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header with Progress */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {currentSession.candidateName} - {currentSession.subject}
            </Title>
            <Text type="secondary">
              Question {currentSession.currentQuestionIndex + 1} of {currentSession.questions.length}
            </Text>
          </div>
         {/*} 
          <Button
            icon={isPaused ? <PlayCircleOutlined /> : <PauseOutlined />}
            onClick={handlePauseResume}
            disabled={currentSession.timeRemaining === 0}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          */}
        </div>
        
        <Progress 
          percent={progressPercent} 
          strokeColor="#1890ff" 
          style={{ marginTop: 16 }}
        />
      </Card>

      {/* Timer */}
      <Card 
        style={{ 
          marginBottom: 16, 
          textAlign: 'center',
          borderColor: isTimeCritical ? '#ff4d4f' : isTimeWarning ? '#faad14' : '#1890ff'
        }}
      >
        <Space align="center">
          <ClockCircleOutlined 
            style={{ 
              fontSize: 32, 
              color: isTimeCritical ? '#ff4d4f' : isTimeWarning ? '#faad14' : '#1890ff'
            }} 
          />
          <Title 
            level={2} 
            style={{ 
              margin: 0, 
              color: isTimeCritical ? '#ff4d4f' : isTimeWarning ? '#faad14' : '#1890ff'
            }}
          >
            {formatTime(currentSession.timeRemaining)}
          </Title>
        </Space>
        
        {isTimeWarning && (
          <Text type="warning" style={{ display: 'block', marginTop: 8 }}>
            {isTimeCritical ? '⚡ Final seconds!' : '⏰ Time running low!'}
          </Text>
        )}
        
        {isPaused && (
          <Alert
            message="Interview Paused"
            description="Please wait for the answer to be submitted"
            type="info"
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* Question */}
      <Card 
        title={
          <Space>
            <Tag color={getDifficultyColor(currentQuestion.difficulty)}>
              {currentQuestion.difficulty.toUpperCase()}
            </Tag>
            <Text>Interview Question</Text>
          </Space>
        } 
        style={{ marginBottom: 16 }}
      >
        <Paragraph style={{ fontSize: 16, lineHeight: 1.6 }}>
          {currentQuestion.question}
        </Paragraph>
      </Card>

      {/* Answer Input */}
      <Card title="Your Answer">
        <Space direction="vertical" style={{ width: '100%' }}>
            <TextArea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onPaste={handlePaste} // ✅ ADD paste handler
            placeholder="Type your answer here..."
            autoSize={{ minRows: 6, maxRows: 12 }}
            maxLength={2000}
            showCount
            disabled={isSubmitting || !isActive}
            style={{ fontSize: 16 }}
            />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">
              💡 Tip: use complete sentences other than single word answers and explain your thought process
            </Text>
            
            <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            onClick={() => setShowSubmitModal(true)}
            disabled={
                !answer.trim() || // Disabled if empty
                isSubmitting || // Disabled during submission
                !isActive || // Disabled if not active
                isPaused || // Disabled if paused
                currentSession?.timeRemaining === 0 // Disabled if time expired
            }
            loading={isSubmitting} // Shows spinner
            style={{ width: '100%', height: 50, fontSize: 16 }}
            >
            {isSubmitting ? 'Submitting Answer...' : 'Submit Answer'}
            </Button>
          </div>
        </Space>
      </Card>

      {/* Submit Confirmation Modal */}
      <Modal
        title="Submit Answer"
        open={showSubmitModal}
        onOk={submitCurrentAnswer}
        onCancel={() => setShowSubmitModal(false)}
        okText="Yes, Submit"
        cancelText="Review Answer"
        okButtonProps={{ loading: isSubmitting }}
      >
        <Space direction="vertical">
          <Text>Ready to submit your answer?</Text>
          <Text type="secondary">You won't be able to modify it once submitted.</Text>
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 150, overflow: 'auto' }}>
            <Text strong>Your answer:</Text>
            <div style={{ marginTop: 8 }}>
              <Text>{answer}</Text>
            </div>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default InterviewManager;
function setActiveTab(arg0: string) {
    throw new Error('Function not implemented.');
}

