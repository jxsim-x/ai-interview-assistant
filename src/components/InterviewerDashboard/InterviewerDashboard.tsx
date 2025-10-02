import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Select,
  Table, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Empty,
  Modal,
  Descriptions,
  Statistic,
  Row,
  Col,
  Popconfirm,
  message,
  Dropdown,
  Alert,
  MenuProps,
  Input
} from 'antd';
import { 
  EyeOutlined, 
  UserOutlined, 
  TrophyOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  ClearOutlined,
  DownloadOutlined,
  ExportOutlined,
  FileTextOutlined,
  WarningOutlined,     
  CloseCircleOutlined 
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { Candidate } from '../../types';
import { deleteCandidate, clearAllCandidates } from '../../store/candidatesSlice';
import type { ColumnsType } from 'antd/es/table';
import { setSelectedSubject } from '../../store/interviewSlice';
import { resumeStorage } from '../../utils/resumeStorage';
import { resetInterview } from '../../store/interviewSlice';

const { Title, Text } = Typography;

const InterviewerDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const candidates = useSelector((state: RootState) => state.candidates.list);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [selectedResume, setSelectedResume] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubjectLocal] = useState('React Developer');
  const [customSubject, setCustomSubject] = useState('');  
  const [resumeBlobUrl, setResumeBlobUrl] = useState<string | null>(null);
  
  

  console.log('🎯 [ENHANCED-DASHBOARD] Dashboard loaded with', candidates.length, 'candidates');
    useEffect(() => {
    // Cleanup blob URLs when component unmounts
    return () => {
        if (resumeBlobUrl) {
        URL.revokeObjectURL(resumeBlobUrl);
        }
    };
    }, [resumeBlobUrl]);
  /**
   * Handle viewing candidate details
   */
  const handleViewDetails = (candidate: Candidate) => {
    console.log('👁️ [ENHANCED-DASHBOARD] Viewing details for:', candidate.name);
    setSelectedCandidate(candidate);
    setDetailsModalVisible(true);
  };
  /**
 * ⭐ NEW: Handle viewing resume text
 */
/**
 * ⭐ UPDATED: Handle viewing actual resume file
 */
const handleViewResume = async (candidate: Candidate) => {
  console.log('📄 [RESUME] Loading resume for:', candidate.name);
  
  if (candidate.resumeFile?.storageId) {
    try {
      message.loading({ content: 'Loading resume...', key: 'resume-load' });
      
      // ✅ Load file from IndexedDB
      const file = await resumeStorage.getResume(candidate.resumeFile.storageId);
      
      if (file) {
        // ✅ Create blob URL and store separately
        const blobUrl = URL.createObjectURL(file);
        setResumeBlobUrl(blobUrl);
        setSelectedCandidate(candidate);
        setResumeModalVisible(true);
        
        message.success({ content: 'Resume loaded!', key: 'resume-load', duration: 1 });
      } else {
        message.error({ content: 'Resume file not found in storage', key: 'resume-load' });
      }
    } catch (error) {
      console.error('❌ [RESUME] Error loading resume:', error);
      message.error({ content: 'Failed to load resume', key: 'resume-load' });
    }
  } else {
    message.warning('No resume file available for this candidate');
  }
};

  /**
   * ⭐ NEW: Handle deleting single candidate
   */
const handleDeleteCandidate = (candidate: Candidate) => {
  dispatch(deleteCandidate(candidate.id));
  message.success(`Deleted candidate: ${candidate.name}`);
  console.log('🗑️ [DASHBOARD] Deleted candidate:', candidate.name);
};

  /**
   * ⭐ NEW: Handle clearing all candidates
   */
  const handleClearAllCandidates = () => {
    dispatch(clearAllCandidates());
    dispatch(resetInterview());
    message.success('All candidates cleared successfully');
    console.log('🧹 [ENHANCED-DASHBOARD] All candidates cleared');
  };

  /**
   * ⭐ NEW: Export candidates to JSON
   */
  const handleExportJSON = () => {
    const dataToExport = candidates.map(candidate => ({
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      status: candidate.status,
      totalScore: candidate.totalScore,
      createdAt: candidate.createdAt,
      completedAt: candidate.completedAt,
      answers: candidate.answers.map(answer => ({
        question: answer.question,
        answer: answer.answer,
        score: answer.score,
        timeUsed: answer.timeUsed,
        maxTime: answer.maxTime
      }))
    }));

    const jsonData = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `interview-candidates-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    message.success('Candidates exported to JSON successfully');
    console.log('📥 [ENHANCED-DASHBOARD] Exported', candidates.length, 'candidates to JSON');
  };

  /**
   * ⭐ NEW: Export candidates to CSV
   */
  const handleExportCSV = () => {
    const csvHeaders = ['Name', 'Email', 'Phone', 'Status', 'Score (%)', 'Created Date', 'Completed Date', 'Questions Answered'];
    
    const csvData = candidates.map(candidate => [
      `"${candidate.name}"`,
      `"${candidate.email}"`,
      `"${candidate.phone}"`,
      `"${candidate.status}"`,
      candidate.totalScore,
      `"${new Date(candidate.createdAt).toLocaleDateString()}"`,
      candidate.completedAt ? `"${new Date(candidate.completedAt).toLocaleDateString()}"` : '"Not completed"',
      candidate.answers.length
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `interview-candidates-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    message.success('Candidates exported to CSV successfully');
    console.log('📊 [ENHANCED-DASHBOARD] Exported', candidates.length, 'candidates to CSV');
  };

  /**
   * Get status color for display
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'processing';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  /**
   * Get score color based on value
   */
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  // ⭐ NEW: Export dropdown menu items
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'json',
      label: 'Export as JSON',
      icon: <DownloadOutlined />,
      onClick: handleExportJSON
    },
    {
      key: 'csv',
      label: 'Export as CSV',
      icon: <ExportOutlined />,
      onClick: handleExportCSV
    }
  ];

  // ⭐ ENHANCED: Table columns configuration with delete action
  const columns: ColumnsType<Candidate> = [
    {
    title: 'Candidate',
    key: 'candidate',
    render: (_, record: Candidate) => {
        // ✅ ADD: Check for pasted answers
        const hasPastedAnswers = record.answers?.some(ans => ans.wasPasted);
        
        return (
        <Space direction="vertical" size={0}>
            <Space>
            <Text strong>{record.name}</Text>
            {/* ✅ ADD: Paste warning badge */}
            {hasPastedAnswers && (
                <Tag color="warning" icon={<WarningOutlined />} style={{ margin: 0, fontSize: 11 }}>
                ⚠️
                </Tag>
            )}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
        </Space>
        );
    }
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Score',
      dataIndex: 'totalScore',
      key: 'score',
      sorter: (a: Candidate, b: Candidate) => b.totalScore - a.totalScore,
      defaultSortOrder: 'descend', 
      render: (score: number) => (
        <Tag color={getScoreColor(score)}>
          {score}%
        </Tag>
      )
    },
    {
        title: 'Date', // ✅ UPDATED COLUMN
        dataIndex: 'createdAt',
        key: 'createdAt',
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (createdAt: string) => {
        const date = new Date(createdAt);
        // ✅ Format: Sep 30, 2025 14:35
        const dateStr = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        const timeStr = date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        return (
            <Space direction="vertical" size={0}>
            <Text>{dateStr}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
                <ClockCircleOutlined /> {timeStr}
            </Text>
            </Space>
        );
        }
    },


    {
    title: 'Actions',
    key: 'actions',
    render: (_, record: Candidate) => (
        <Space>
        <Button
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            size="small"
        >
            Details
        </Button>
        
        {/* ✅ FIXED: Check for storageId instead of url */}
        {record.resumeFile?.storageId && (
            <Button
            icon={<FileTextOutlined />}
            onClick={() => handleViewResume(record)}
            size="small"
            >
            Resume
            </Button>
        )}
        
        <Popconfirm
        title="Delete this candidate?"
        description="This action cannot be undone."
        onConfirm={() => handleDeleteCandidate(record)} // ✅ Pass entire record
        okText="Yes, delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        >
        <Button danger icon={<DeleteOutlined />} size="small">
            Delete
        </Button>
        </Popconfirm>
        </Space>
    )
    }
  ];

  // Calculate statistics
  const totalCandidates = candidates.length;
  const completedCandidates = candidates.filter(c => c.status === 'completed').length;
  const averageScore = completedCandidates > 0 
    ? Math.round(candidates
        .filter(c => c.status === 'completed')
        .reduce((sum, c) => sum + c.totalScore, 0) / completedCandidates)
    : 0;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* ⭐ ENHANCED: Header with Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Interviewer Dashboard
        </Title>
        
        {/* ⭐ NEW: Export and Clear Actions */}
        {candidates.length > 0 && (
          <Space>
            <Dropdown 
              menu={{ items: exportMenuItems }} 
              placement="bottomRight"
              trigger={['click']}
            >
              <Button icon={<DownloadOutlined />} type="default">
                Export Data
              </Button>
            </Dropdown>
            
            <Popconfirm
              title="Clear All Candidates"
              description="Are you sure you want to delete ALL candidates? This action cannot be undone."
              onConfirm={handleClearAllCandidates}
              okText="Yes, Clear All"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              placement="bottomRight"
            >
              <Button icon={<ClearOutlined />} danger>
                Clear All
              </Button>
            </Popconfirm>
          </Space>
        )}
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Total Candidates" 
              value={totalCandidates}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Completed Interviews" 
              value={completedCandidates}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Average Score" 
              value={averageScore}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ 
                color: getScoreColor(averageScore) === 'success' ? '#3f8600' : 
                       getScoreColor(averageScore) === 'warning' ? '#d48806' : '#cf1322' 
              }}
            />
          </Card>
        </Col>
      </Row>
{/* ADD this entire card before your existing candidates table */}
    <Card title="🎯 Interview Configuration" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
            <Text strong style={{ fontSize: 16 }}>Interview Subject:</Text>
            <Select
                size="large"
                style={{ width: '100%', marginTop: 8 }}
                value={selectedSubject}
                onChange={(value) => {
                setSelectedSubjectLocal(value);
                if (value !== 'Custom Subject') {
                    dispatch(setSelectedSubject(value));
                }
                }}
                options={[
                { label: '⚛️ React Developer', value: 'React Developer' },
                { label: '🟢 Node.js Developer', value: 'Node.js Developer' },
                { label: '🐍 Python Developer', value: 'Python Developer' },
                { label: '📊 Data Scientist', value: 'Data Scientist' },
                { label: '📱 Product Manager', value: 'Product Manager' },
                { label: '🎨 UI/UX Designer', value: 'UI/UX Designer' },
                { label: '✨ Custom Subject', value: 'Custom Subject' }
                ]}
            />
            
            {/* 🔧 FIX: Add custom subject input field */}
            {selectedSubject === 'Custom Subject' && (
                <Space.Compact style={{ width: '100%', marginTop: 12 }}>
                <Input
                    size="large"
                    placeholder="Enter custom subject (e.g., Full Stack, DevOps, etc.)"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    onPressEnter={() => {
                    if (customSubject.trim()) {
                        dispatch(setSelectedSubject(customSubject.trim()));
                        message.success(`Custom subject set: ${customSubject.trim()}`);
                    }
                    }}
                />
                <Button 
                size="large" 
                type="primary"
                onClick={() => {
                    if (customSubject.trim()) {
                    dispatch(setSelectedSubject(customSubject.trim()));
                    
                    // ✅ REPLACE message.success with Modal.success
                    Modal.success({
                        title: '✅ Subject Set Successfully',
                        content: `Custom subject "${customSubject.trim()}" has been configured for new interviews.`,
                        okText: 'Close',
                        centered: true,
                        closable: true, // ✅ Adds X button
                        maskClosable: true
                    });
                    } else {
                    message.error('Please enter a custom subject');
                    }
                }}
                >
                Set Subject
                </Button>
                </Space.Compact>
            )}
            </div>
            
            <Alert
            message={
                <Space direction="vertical" size="small">
                <div><Text strong>Question Structure:</Text> Easy: 2 × 20sec • Medium: 2 × 60sec • Hard: 2 × 120sec</div>
                <div><Text strong>Interview Duration:</Text> 📅 ~400 seconds maximum</div>
                <div><Text type="secondary">Powered by Gemini 2.5 Flash model</Text></div>
                </Space>
            }
            type="info"
            />
        </Space>
    </Card>
      {/* ⭐ ENHANCED: Candidates Table with Delete Actions */}
      <Card 
        title="Interview Results" 
        extra={candidates.length > 0 ? (
          <Text type="secondary">
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} • Sorted by score (highest first)
          </Text>
        ) : null}
      >
        {candidates.length === 0 ? (
          <Empty 
            description="No candidates yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Text type="secondary">
              Candidates will appear here after they upload their resumes and complete interviews.
            </Text>
          </Empty>
        ) : (
          <Table
            dataSource={candidates}
            columns={columns}
            rowKey="id"
            pagination={{ 
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} candidates`,
              size: 'default'
            }}

            bordered
          />
        )}
      </Card>

      {/* Candidate Details Modal */}
      <Modal
        title={`${selectedCandidate?.name} - Interview Details`}
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedCandidate && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="Candidate Information" bordered column={2}>
              <Descriptions.Item label="Name">{selectedCandidate.name}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedCandidate.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedCandidate.phone}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedCandidate.status)}>
                  {selectedCandidate.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Total Score">
                <Tag color={getScoreColor(selectedCandidate.totalScore)}>
                  {selectedCandidate.totalScore}%
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Questions Answered">
                {selectedCandidate.answers.length}
              </Descriptions.Item>
            </Descriptions>

            {selectedCandidate.answers.length > 0 ? (
              <Card title="Interview Responses" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                {selectedCandidate.answers.map((answer, index) => (
                <div key={index} style={{ 
                    marginBottom: 8, 
                    padding: 12, 
                    background: answer.wasPasted ? '#fff7e6' : '#fafafa', // ✅ Highlight if pasted
                    borderRadius: 4,
                    border: answer.wasPasted ? '1px solid #ffa940' : 'none' // ✅ Orange border if pasted
                }}>
                    <Text strong>Q{index + 1}: {answer.question}</Text>
                    <br />
                    <Text>Answer: {answer.answer || '(No answer provided)'}</Text>
                    <br />
                    <Space wrap>
                    <Tag color={answer.score >= 70 ? 'green' : answer.score >= 40 ? 'orange' : 'red'}>
                        Score: {answer.score}%
                    </Tag>
                    <Tag icon={<ClockCircleOutlined />}>
                        Time: {answer.timeUsed}s / {answer.maxTime}s
                    </Tag>
                    
                    {/* ✅ FIX #7: Paste Detection Display */}
                    {answer.wasPasted && (
                        <Tag color="warning" icon={<WarningOutlined />}>
                        ⚠️ Paste Detected ({answer.pasteCount || 1}×)
                        </Tag>
                    )}
                    
                    {/* ✅ BONUS: Blank Answer Detection */}
                    {(!answer.answer || answer.answer.trim().length === 0) && (
                        <Tag color="red" icon={<CloseCircleOutlined />}>
                        ❌ No Answer
                        </Tag>
                    )}
                    </Space>
                </div>
                ))}
                </Space>
              </Card>
            ) : (
              <Card title="Interview Status" size="small">
                <Text type="secondary">
                  This candidate hasn't completed the interview yet. Interview responses will appear here once completed.
                </Text>
              </Card>
            )}
          </Space>
        )}
      </Modal>

        {/* ⭐ UPDATED: Resume File Preview Modal */}
        <Modal
        title={`Resume - ${selectedCandidate?.name || 'Candidate'}`}
        open={resumeModalVisible}
        onCancel={() => {
            // ✅ CLEANUP: Revoke blob URL to free memory
            if (resumeBlobUrl) {
            URL.revokeObjectURL(resumeBlobUrl);
            setResumeBlobUrl(null);
            }
            setResumeModalVisible(false);
            setSelectedCandidate(null);
        }}
        footer={[
            <Button 
            key="close" 
            onClick={() => {
                if (resumeBlobUrl) {
                URL.revokeObjectURL(resumeBlobUrl);
                setResumeBlobUrl(null);
                }
                setResumeModalVisible(false);
                setSelectedCandidate(null);
            }}
            >
            Close
            </Button>
        ]}
        width="80%"
        style={{ top: 20 }}
        >
        {resumeBlobUrl ? (
            <iframe
            src={resumeBlobUrl}
            style={{ width: '100%', height: '75vh', border: 'none' }}
            title="Resume Preview"
            />
        ) : (
            <Empty description="No resume to display" />
        )}
        </Modal>


    </div>
  );
};

export default InterviewerDashboard;
