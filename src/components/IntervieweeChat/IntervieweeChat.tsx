import React, { useState, useEffect, useRef } from 'react';

import {
  Card,
  Upload,
  Button,
  Form,
  Input,
  Typography,
  Steps,
  Space,
  Alert,
  Progress,
  Divider,
  message,
  Modal,
  Result
} from 'antd';

import {
  UploadOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  RocketOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  EditOutlined
} from '@ant-design/icons';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  addCandidate,
  updateCandidate,
  resetCurrentSession,
  checkExistingCandidate
} from '../../store/candidatesSlice';
import { ResumeParser } from '../../utils/resumeParser';
import type { UploadFile } from 'antd/es/upload';
import { v4 as uuidv4 } from 'uuid';
import { startInterview } from '../../store/interviewSlice';
import { geminiService } from '../../services/geminiService';
import { resumeStorage } from '../../utils/resumeStorage';

const { Title, Text } = Typography;

const IntervieweeChat: React.FC = () => {
  const dispatch = useDispatch();
  const currentCandidate = useSelector((state: RootState) => state.candidates.currentCandidate);
  const allCandidates = useSelector((state: RootState) => state.candidates.list);

  // Component state
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [parsedData, setParsedData] = useState<any>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [form] = Form.useForm();
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const selectedSubject = useSelector((state: RootState) => state.interview.selectedSubject);
  const isInterviewActive = useSelector((state: RootState) => state.interview.isActive);

  // 🔧 FIX: New state flags to control workflow
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalProcessing, setIsModalProcessing] = useState(false);
  const [currentParsedEmail, setCurrentParsedEmail] = useState<string | null>(null);

  // Component mounting and initialization tracking
  const isMounted = useRef(false);
  const hasInitialized = useRef(false);
  const uploadDebounce = useRef<NodeJS.Timeout | null>(null);

  // Component mount tracking
  useEffect(() => {
    isMounted.current = true;
    console.log('🎬 [FIXED] IntervieweeChat component mounted');

    return () => {
      isMounted.current = false;
      console.log('🏁 [FIXED] IntervieweeChat component unmounting');

      // Cleanup debounce timers
      if (uploadDebounce.current) {
        clearTimeout(uploadDebounce.current);
      }
    };
  }, []);
useEffect(() => {
  if (currentCandidate && !hasInitialized.current) {
    console.log('🔄 [RELOAD] Restoring session for:', currentCandidate.name);
    
    // Determine what step to show based on candidate status
    if (currentCandidate.status === 'completed') {
      // Show completion screen
      setCurrentStep(2);
    } else if (currentCandidate.status === 'not-started') {
      // Show start interview screen
      setCurrentStep(2);
      message.info(`Welcome back, ${currentCandidate.name}! Ready to start?`);
    } else if (currentCandidate.status === 'in-progress' || currentCandidate.status === 'paused') {
      // Interview was in progress - show start screen with resume option
      setCurrentStep(2);
      Modal.info({
        title: '🔄 Session Restored',
        content: `Welcome back, ${currentCandidate.name}! Your session has been restored. You can resume your interview.`,
        okText: 'Got it'
      });
    }
  }
}, [currentCandidate]);

  // 🔧 FIX: Enhanced state cleanup - only clear if dashboard is actually empty
  useEffect(() => {
    if (!hasInitialized.current && isMounted.current) {
      hasInitialized.current = true;
      console.log('🔧 [FIXED] Component initializing...');

      // Only clear if truly stale (dashboard empty + current candidate exists)
      if (allCandidates.length === 0 && currentCandidate) {
        console.log('🧹 [FIXED] Dashboard empty but currentCandidate exists, clearing stale data');
        dispatch(resetCurrentSession());
        // Reset all local states
        setShowWelcomeBack(false);
        setIsEditMode(false);
        setCurrentParsedEmail(null);
      }
    }
  }, [allCandidates.length, currentCandidate, dispatch]);

  // Form pre-filling with better timing
  useEffect(() => {
    if (currentCandidate && currentStep === 1 && isMounted.current && !isEditMode) {
      // Only pre-fill if not in edit mode
      const timer = setTimeout(() => {
        if (form && isMounted.current) {
          form.setFieldsValue({
            name: currentCandidate.name,
            email: currentCandidate.email,
            phone: currentCandidate.phone
          });
          console.log('📝 [FIXED] Form pre-filled with current candidate data');
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [currentCandidate, currentStep, form, isEditMode]);

  // Steps configuration
  const steps = [
    {
      title: 'Upload Resume',
      description: 'Upload your resume (PDF or DOCX)',
      icon: <UploadOutlined />
    },
    {
      title: 'Verify Information',
      description: 'Confirm extracted details',
      icon: <UserOutlined />
    },
    {
      title: 'Start Interview',
      description: 'Begin AI-powered interview',
      icon: <RocketOutlined />
    }
  ];

  // 🔧 FIX: Enhanced start new session - clear everything properly
  const handleStartNewSession = () => {
    console.log('🔄 [FIXED] Starting new session - creating new candidate');

    setIsModalProcessing(true);
    setShowWelcomeBack(false);

    if (parsedData && currentParsedEmail) {
      // Create new candidate with parsed data
        dispatch(addCandidate({
        name: parsedData.name || 'Unknown Name',
        email: currentParsedEmail,
        phone: parsedData.phone || '',
        resumeText: parsedData.fullText || '',
        resumeFile: uploadedFile ? {
            name: uploadedFile.name,
            type: uploadedFile.type,
            size: uploadedFile.size,
            storageId: `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            uploadedAt: new Date().toISOString()
        } : undefined
        }));

      // Complete state reset
      setTimeout(() => {
        if (isMounted.current) {
          setParsedData(null);
          setUploadedFile(null);
          setMissingFields([]);
          setIsModalProcessing(false);
          setCurrentParsedEmail(null);
          setIsEditMode(false);
          setCurrentStep(2);
          message.success('Added as new candidate successfully!');
        }
      }, 300);
    } else {
      setIsModalProcessing(false);
      setCurrentStep(0);
      message.error('No parsed data available. Please upload resume again.');
    }
  };

  // 🔧 FIX: Enhanced continue session
  const handleContinueSession = () => {
    console.log('🔄 [FIXED] Continuing session');

    setIsModalProcessing(true);
    setShowWelcomeBack(false);

    setTimeout(() => {
      if (isMounted.current) {
        // Clear upload-related states but keep current candidate
        setParsedData(null);
        setUploadedFile(null);
        setMissingFields([]);
        setIsModalProcessing(false);
        setCurrentParsedEmail(null);
        setIsEditMode(false);
        setCurrentStep(2);

        if (currentCandidate) {
          message.success(`Welcome back, ${currentCandidate.name}!`);
        }
      }
    }, 200);
  };

  // 🔧 FIX: Complete session reset
  const handleResetToUpload = () => {
    console.log('🔄 [FIXED] Resetting to upload step');

    setCurrentStep(0);
    setUploadedFile(null);
    setParsedData(null);
    setMissingFields([]);
    setIsSubmittingForm(false);
    setIsEditMode(false);
    setShowWelcomeBack(false);
    setCurrentParsedEmail(null);
    form.resetFields();

    message.info('Reset to upload step');
  };

  // 🔧 FIX: File upload with proper workflow control
  const handleFileUpload = async (file: any): Promise<boolean> => {
    console.log('📁 [FIXED] File selected:', file.name, 'Edit mode:', isEditMode);
    if (currentCandidate && currentCandidate.status === 'completed') {
        console.log('🧹 [CHAT] Previous interview completed, resetting for new candidate');
        dispatch(resetCurrentSession()); // ✅ Use correct action name
        setCurrentStep(0);
        setParsedData(null); // ✅ Use correct state variable
        setUploadedFile(null); // ✅ Clear uploaded file
    }
    
    // Clear any existing debounce
    if (uploadDebounce.current) {
        clearTimeout(uploadDebounce.current);
    }

    // Validate file
    const validation = ResumeParser.validateFile(file);
    if (!validation.valid) {
      message.error(validation.error);
      return false;
    }

    setUploadedFile(file);
    const originalFileUrl = URL.createObjectURL(file);
    setIsProcessing(true);
    setProcessingProgress(0);

    // Progress simulation
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 12;
      });
    }, 180);

    try {
      const parsedInfo = await ResumeParser.parseResume(file);
      clearInterval(progressInterval);
      setProcessingProgress(100);
      setParsedData(parsedInfo);
      setCurrentParsedEmail(parsedInfo.email);
      // ⭐ NEW: Create blob URL for file preview
      const fileBlob = new Blob([file], { type: file.type });
      const fileUrl = URL.createObjectURL(fileBlob);
      
      // Store file data along with parsed info
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: fileUrl,
        uploadedAt: new Date().toISOString()
      };     

      console.log('📊 [FIXED] Parsed data:', parsedInfo);

      // 🔧 FIX: Skip duplicate check if in edit mode
      if (isEditMode) {
        console.log('✏️ [FIXED] Edit mode - skipping duplicate check');

        const missing: string[] = [];
        if (!parsedInfo.name) missing.push('name');
        if (!parsedInfo.email) missing.push('email');
        if (!parsedInfo.phone) missing.push('phone');

        setMissingFields(missing);

        // Pre-fill form
        setTimeout(() => {
          if (form && isMounted.current) {
            form.setFieldsValue({
              name: parsedInfo.name || '',
              email: parsedInfo.email || '',
              phone: parsedInfo.phone || ''
            });
          }
        }, 100);

        setCurrentStep(1);
        message.success('Resume processed for editing!');
        return false;
      }

      // 🔧 FIX: Only check for duplicates if NOT in edit mode AND have contact info
      if (allCandidates.length > 0 && (parsedInfo.email || parsedInfo.phone)) {
        console.log('🔍 [FIXED] Checking for duplicates in', allCandidates.length, 'candidates');

        const exists = allCandidates.find((c) => {
          const emailMatch = parsedInfo.email && c.email &&
            c.email.toLowerCase().trim() === parsedInfo.email.toLowerCase().trim();
          const phoneMatch = parsedInfo.phone && c.phone &&
            c.phone.replace(/\D/g, '') === parsedInfo.phone.replace(/\D/g, '');
          return emailMatch || phoneMatch;
        });

        if (exists) {
          console.log('👥 [FIXED] Duplicate found:', exists.name, '- showing modal');
          // Set the found candidate as current
          dispatch(checkExistingCandidate({
            email: parsedInfo.email,
            name: parsedInfo.name
          }));
          setShowWelcomeBack(true);
          setIsProcessing(false);
          return false;
        }
      }

      // New candidate - proceed directly to form
      console.log('🆕 [FIXED] New candidate, proceeding to form');

      const missing: string[] = [];
      if (!parsedInfo.name) missing.push('name');
      if (!parsedInfo.email) missing.push('email');
      if (!parsedInfo.phone) missing.push('phone');

      setMissingFields(missing);

      // Pre-fill form
      setTimeout(() => {
        if (form && isMounted.current) {
          form.setFieldsValue({
            name: parsedInfo.name || '',
            email: parsedInfo.email || '',
            phone: parsedInfo.phone || ''
          });
          console.log('📝 [FIXED] Form pre-filled with parsed data');
        }
      }, 100);

      setCurrentStep(1);
      message.success('Resume processed successfully!');

    } catch (error) {
      clearInterval(progressInterval);
      console.error('❌ [FIXED] Resume processing failed:', error);
      message.error(`Resume processing failed: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
    }

    return false;
  };

  // 🔧 FIX: Form submission with proper workflow handling
const handleSubmitInfo = async (values: any) => {
  console.log('📝 [FIXED] Submitting candidate info:', values, 'Edit mode:', isEditMode);
  setIsSubmittingForm(true);

  try {
    // ✅ SAVE FILE TO INDEXED DB
    let resumeFileData = undefined;
    
    if (uploadedFile) {
      const fileId = `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await resumeStorage.saveResume(fileId, uploadedFile);
      
      resumeFileData = {
        name: uploadedFile.name,
        type: uploadedFile.type,
        size: uploadedFile.size,
        storageId: fileId, // ✅ Store IndexedDB ID instead of blob URL
        uploadedAt: new Date().toISOString()
      };
      
      console.log('💾 [STORAGE] Resume saved with ID:', fileId);
    }

    if (isEditMode && currentCandidate) {
      // Update existing candidate
      dispatch(updateCandidate({
        id: currentCandidate.id,
        updates: {
          name: values.name,
          email: values.email,
          phone: values.phone,
          resumeText: parsedData?.fullText || currentCandidate.resumeText || '',
          resumeFile: resumeFileData || currentCandidate.resumeFile
        }
      }));
      console.log('✅ [FIXED] Updated existing candidate');
      message.success('Information updated successfully!');
    } else {
      // Add new candidate
      dispatch(addCandidate({
        name: values.name,
        email: values.email,
        phone: values.phone,
        resumeText: parsedData?.fullText || '',
        resumeFile: resumeFileData
      }));
      console.log('✅ [FIXED] Added new candidate');
      message.success('Information saved successfully!');
    }

    // Clean state and navigate
    setTimeout(() => {
      if (isMounted.current) {
        setParsedData(null);
        setUploadedFile(null);
        setMissingFields([]);
        setShowWelcomeBack(false);
        setIsEditMode(false);
        setCurrentParsedEmail(null);
        setIsSubmittingForm(false);
        setCurrentStep(2);
      }
    }, 300);
  } catch (error) {
    console.error('❌ [FIXED] Failed to save candidate:', error);
    message.error('Failed to save information');
    setIsSubmittingForm(false);
  }
};


const handleStartInterview = async () => {
  if (!currentCandidate) return;
  setIsStartingInterview(true);

  try {
    console.log('🚀 [INTERVIEW] Starting interview for:', currentCandidate.name);

    // 🔧 FIX: Get current subject from Redux (set in dashboard)

    console.log('📚 [INTERVIEW] Using subject:', selectedSubject);

    // Generate questions using Gemini service
    const easyQuestions = await geminiService.getInterviewQuestions(selectedSubject, 'easy', 2);
    const mediumQuestions = await geminiService.getInterviewQuestions(selectedSubject, 'medium', 2);
    const hardQuestions = await geminiService.getInterviewQuestions(selectedSubject, 'hard', 2);

    const allQuestions = [
      ...easyQuestions.map((q, i) => ({
        id: `easy_${i}`,
        question: q,
        difficulty: 'easy' as const,
        timeLimit: 20, // 20 seconds
        subject: selectedSubject
      })),
      ...mediumQuestions.map((q, i) => ({
        id: `medium_${i}`,
        question: q,
        difficulty: 'medium' as const,
        timeLimit: 60, // 1 minute
        subject: selectedSubject
      })),
      ...hardQuestions.map((q, i) => ({
        id: `hard_${i}`,
        question: q,
        difficulty: 'hard' as const,
        timeLimit: 120, // 2 minutes
        subject: selectedSubject
      }))
    ];

    const interviewSession = {
      id: uuidv4(),
      candidateId: currentCandidate.id,
      candidateName: currentCandidate.name,
      subject: selectedSubject,
      questions: allQuestions,
      answers: [],
      status: 'in-progress' as const,
      currentQuestionIndex: 0,
      timeRemaining: allQuestions[0]?.timeLimit || 120,
      startedAt: new Date().toISOString(),
      totalScore: 0,
      averageScore: 0
    };

    dispatch(startInterview(interviewSession));
    message.success(`Starting ${selectedSubject} interview! Good luck!`);
    
  } catch (error) {
    console.error('Failed to start interview:', error);
    message.error('Failed to start interview. Please try again.');
  } finally {
    setIsStartingInterview(false);
  }
};


  // 🔧 FIX: Complete session reset for debugging
  const handleResetSession = () => {
    console.log('🧹 [FIXED] Performing complete session reset');

    setParsedData(null);
    setUploadedFile(null);
    setMissingFields([]);
    setShowWelcomeBack(false);
    setIsSubmittingForm(false);
    setIsEditMode(false);
    setCurrentParsedEmail(null);
    form.resetFields();
    setCurrentStep(0);
    dispatch(resetCurrentSession());

    message.success('Session reset successfully');
  };

  // 🔧 FIX: Edit information - set edit mode properly
  const handleEditInformation = () => {
    console.log('✏️ [FIXED] Entering edit mode for candidate:', currentCandidate?.name);

    if (currentCandidate && form) {
      setIsEditMode(true); // Set edit mode flag

      // Pre-fill form with current candidate data
      setTimeout(() => {
        if (form && isMounted.current) {
          form.setFieldsValue({
            name: currentCandidate.name,
            email: currentCandidate.email,
            phone: currentCandidate.phone
          });
          console.log('📝 [FIXED] Form pre-filled for editing');
        }
      }, 100);

      setCurrentStep(1);
      message.info('Edit mode: You can update your information or upload a new resume');
    }
  };

  return(

        <>
            {/* ✅ FIX #6: Prevent Re-interview - Check if already completed */}
            {currentCandidate && currentCandidate.status === 'completed' && (
            <Card>
                <Result
                status="success"
                title="Interview Already Completed"
                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                subTitle={
                    <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
                    <Text>You have already completed your interview.</Text>
                    {currentCandidate.completedAt && (
                        <Text type="secondary">
                        Completed on: {new Date(currentCandidate.completedAt).toLocaleString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                        </Text>
                    )}
                    <Divider />
                    <Space direction="vertical" size="small">
                        <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                        Final Score: {currentCandidate.totalScore}/100
                        </Text>
                        <Text type="secondary">
                        Questions Answered: {currentCandidate.answers?.length || 0}/6
                        </Text>
                    </Space>
                    </Space>
                }
                extra={[
                    <Button
                    key="new"
                    type="primary"
                    size="large"
                    icon={<ReloadOutlined />}
                    onClick={() => {
                        console.log('🔄 Starting fresh interview for new candidate');
                        dispatch(resetCurrentSession());
                        setCurrentStep(0);
                        setParsedData(null);
                        setUploadedFile(null);
                        setIsEditMode(false);
                        form.resetFields();
                        message.info('Ready for new candidate. Please upload resume.');
                    }}
                    >
                    Start New Interview (New Candidate)
                    </Button>
                ]}
                />
            </Card>
            )}
    {/* Only show interview flow if NOT completed */}
    {(!currentCandidate || currentCandidate.status !== 'completed') && (
    <>
    
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      {/* 🔧 FIX: Enhanced Welcome Back Modal with loading states */}
      <Modal
        title="Welcome Back!"
        open={showWelcomeBack}
        footer={null}
        closable={false}
        width={480}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircleOutlined 
            style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} 
          />
          <Title level={4}>
            We found an existing profile for {currentCandidate?.name || 'this contact'}
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
            What would you like to do?
          </Text>

          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card size="small" hoverable>
              <div style={{ textAlign: 'left' }}>
                <Title level={5} style={{ margin: '0 0 8px 0' }}>
                  Continue Session
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Resume with your existing profile and go directly to interview.
                </Text>
              </div>
            </Card>

            <Card size="small" hoverable>
              <div style={{ textAlign: 'left' }}>
                <Title level={5} style={{ margin: '0 0 8px 0' }}>
                  Add as New Candidate  
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Create a separate profile with the information from this resume.
                </Text>
              </div>
            </Card>
          </Space>

          <div style={{ marginTop: '32px' }}>
            <Space size="middle">
              <Button 
                type="primary" 
                onClick={handleContinueSession}
                loading={isModalProcessing}
                size="large"
              >
                Continue Session
              </Button>
              <Button 
                onClick={handleStartNewSession}
                loading={isModalProcessing}
                size="large"
              >
                Add as New
              </Button>
            </Space>
          </div>
        </div>
      </Modal>

      <Card>
        <div style={{ marginBottom: '32px' }}>
          <Title level={2} style={{ textAlign: 'center', marginBottom: '8px' }}>
            Welcome to AI Interview Assistant
          </Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
            Upload your resume and get ready for an AI-powered interview experience
          </Text>
        </div>

        <Steps current={currentStep} items={steps} style={{ marginBottom: '32px' }} />

        {/* Navigation controls */}
        {currentStep > 0 && (
          <div style={{ marginBottom: '16px', textAlign: 'right' }}>
            <Space>
              <Button
                onClick={handleResetToUpload}
                type="dashed"
                size="small"
                icon={<ReloadOutlined />}
              >
                Start Over
              </Button>
              {/*}
              {process.env.NODE_ENV === 'development' && (
                <Button
                  onClick={handleResetSession}
                  type="text"
                  size="small"
                  danger
                
                  Debug: Reset All
                </Button>
                
              )}>*/}
            </Space>
          </div>
        )}

        {/* Step 1: Resume Upload */}
        {currentStep === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Upload.Dragger
              name="resume"
              multiple={false}
              beforeUpload={handleFileUpload}
              showUploadList={false}
              accept=".pdf,.docx"
              style={{ padding: '40px' }}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ fontSize: '48px' }} />
              </p>
              <p className="ant-upload-text" style={{ fontSize: '18px' }}>
                Click or drag your resume here to upload
              </p>
              <p className="ant-upload-hint" style={{ fontSize: '14px' }}>
                Supports PDF and DOCX files (max 5MB)
              </p>
            </Upload.Dragger>

            {isProcessing && (
              <div style={{ marginTop: '24px' }}>
                <Progress
                  percent={processingProgress}
                  status={processingProgress === 100 ? 'success' : 'active'}
                  strokeColor={{ from: '#108ee9', to: '#87d068' }}
                />
                <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                  Processing your resume and extracting information...
                </Text>
              </div>
            )}

            {uploadedFile && !isProcessing && (
              <Alert
                message="File uploaded successfully"
                description={`${uploadedFile.name} (${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)`}
                type="success"
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
          </div>
        )}

        {/* Step 2: Verify Information */}
        {currentStep === 1 && (
          <div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {isEditMode && (
                <Alert
                  message="Edit Mode"
                  description="You're updating existing information. Upload a new resume or modify the fields below."
                  type="info"
                  showIcon
                  style={{ flex: 1, marginRight: '16px' }}
                />
              )}
              <Button
                onClick={handleResetToUpload}
                size="small"
                type="text"
                icon={<ReloadOutlined />}
              >
                {isEditMode ? 'Upload different file?' : 'Wrong file? Upload again'}
              </Button>
            </div>

            {missingFields.length > 0 && (
              <Alert
                message="Missing Information"
                description={`Please provide the following: ${missingFields.join(', ')}`}
                type="warning"
                showIcon
                style={{ marginBottom: '24px' }}
              />
            )}

            {parsedData && parsedData.confidence?.name > 0 && (
              <Alert
                message="Information Extracted"
                description={`We've extracted information from your resume with ${Math.round(parsedData.confidence.name * 100)}% confidence. Please verify and complete any missing fields.`}
                type="info"
                showIcon
                style={{ marginBottom: '24px' }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmitInfo}
              size="large"
            >
              <Form.Item
                label="Full Name"
                name="name"
                rules={[{ required: true, message: 'Please enter your full name' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter your full name"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="Email Address"
                name="email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Enter your email address"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="Phone Number"
                name="phone"
                rules={[{ required: true, message: 'Please enter your phone number' }]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="Enter your phone number"
                  size="large"
                />
              </Form.Item>

              <div style={{ marginTop: '32px' }}>
                <Space size="middle">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={isSubmittingForm}
                    size="large"
                  >
                    {isEditMode ? 'Update Information' : 'Confirm & Continue'}
                  </Button>
                  <Button
                    onClick={handleResetToUpload}
                    size="large"
                  >
                    Upload Different File
                  </Button>
                </Space>
              </div>
            </Form>
          </div>
        )}

        {/* Step 3: Start Interview */}
        {currentStep === 2 && currentCandidate && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CheckCircleOutlined 
              style={{ fontSize: '64px', color: '#52c41a', marginBottom: '24px' }} 
            />

            <Title level={2} style={{ marginBottom: '16px' }}>
              Welcome, {currentCandidate.name}! 👋
            </Title>

            <Text type="secondary" style={{ fontSize: '16px', display: 'block', marginBottom: '32px' }}>
              Your information has been saved successfully.<br />
              You're all set to begin the AI-powered interview.
            </Text>

            <Card style={{ textAlign: 'left', marginBottom: '32px' }}>
              <Space direction="vertical" size="small">
                <Text>📧 <strong>Email:</strong> {currentCandidate.email}</Text>
                <Text>📱 <strong>Phone:</strong> {currentCandidate.phone}</Text>
                <Text>📄 <strong>Resume:</strong> Processed successfully</Text>
              </Space>
            </Card>

            <Space size="middle">
            <Button
                type="primary"
                size="large"
                icon={<RocketOutlined />}
                onClick={handleStartInterview}
                loading={isStartingInterview} // ✅ Shows spinner during loading
                disabled={isStartingInterview} // ✅ Prevents multiple clicks
                style={{ width: '100%', height: 50, fontSize: 18 }}
                >
                {isStartingInterview ? 'Starting Interview...' : 'Start Interview Now'}
            </Button>

            {/* ✅ ADD: Loading message under button */}
            {isStartingInterview && (
                <Alert
                    message="🚀 Preparing your interview session..."
                    description="Generating AI-powered questions. This may take 10-15 seconds."
                    type="info"
                    showIcon
                    style={{ marginTop: 16 }}
                />
            )}
            <Button
            icon={<EditOutlined />}
            onClick={handleEditInformation}
            disabled={isInterviewActive || isStartingInterview} // ✅ ADD: Disable during loading too
            style={{ opacity: (isInterviewActive || isStartingInterview) ? 0.5 : 1 }}
            >
            {isInterviewActive 
                ? 'Interview in Progress' 
                : isStartingInterview 
                ? 'Loading Interview...' 
                : 'Edit Information'
            }
            </Button>
            </Space>
          </div>
        )}
      </Card>
    </div>
    </>
    )}
        </>
  );
};

export default React.memo(IntervieweeChat);