import React, { useState } from 'react';
import { 
  Card, 
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
  MenuProps
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
  FileTextOutlined
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { Candidate } from '../../types';
import { deleteCandidate, clearAllCandidates } from '../../store/candidatesSlice';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

const InterviewerDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const candidates = useSelector((state: RootState) => state.candidates.list);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [selectedResume, setSelectedResume] = useState<string | null>(null);

  console.log('🎯 [ENHANCED-DASHBOARD] Dashboard loaded with', candidates.length, 'candidates');

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
    const handleViewResume = (candidate: Candidate) => {
    console.log('📄 [FILE-PREVIEW] Viewing resume file for:', candidate.name);
    
    if (candidate.resumeFile && candidate.resumeFile.url) {
        setSelectedCandidate(candidate);
        setResumeModalVisible(true);
    } else {
        message.error('Resume file not available for preview');
    }
    };

  /**
   * ⭐ NEW: Handle deleting single candidate
   */
  const handleDeleteCandidate = (candidateId: string, candidateName: string) => {
    dispatch(deleteCandidate(candidateId));
    message.success(`Deleted candidate: ${candidateName}`);
    console.log('🗑️ [ENHANCED-DASHBOARD] Deleted candidate:', candidateName);
  };

  /**
   * ⭐ NEW: Handle clearing all candidates
   */
  const handleClearAllCandidates = () => {
    dispatch(clearAllCandidates());
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
      render: (_, record: Candidate) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <div>
            <div style={{ fontWeight: 600 }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.email}
            </Text>
          </div>
        </Space>
      )
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
      title: 'Date',
      key: 'date',
      render: (_, record: Candidate) => (
        <div>
          <div style={{ fontSize: 12 }}>
            Created: {new Date(record.createdAt).toLocaleDateString()}
          </div>
          {record.completedAt && (
            <div style={{ fontSize: 12, color: '#52c41a' }}>
              Completed: {new Date(record.completedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )
    },
    {
    title: 'Resume',
    key: 'resume', 
    width: 100,
      render: (_, record: Candidate) => {
        const hasFile = record.resumeFile && record.resumeFile.url;
        const isPDF = record.resumeFile?.type === 'application/pdf';
        
        return (
          <Button
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleViewResume(record)}
            disabled={!hasFile}
          >
            {hasFile ? `${isPDF ? 'PDF' : 'DOCX'} Preview` : 'No File'}
          </Button>
        );
      }

    },

    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: Candidate) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            View
          </Button>
          <Popconfirm
            title="Delete Candidate"
            description={`Are you sure you want to delete ${record.name}?`}
            onConfirm={() => handleDeleteCandidate(record.id, record.name)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              icon={<DeleteOutlined />}
              danger
            >
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
                    <Card key={index} size="small" style={{ backgroundColor: '#fafafa' }}>
                      <Text strong>Q{index + 1}: {answer.question}</Text>
                      <div style={{ marginTop: 8 }}>
                        <Text>Answer: {answer.answer}</Text>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Score: <Tag color={getScoreColor(answer.score)}>{answer.score}%</Tag></Text>
                        <Text type="secondary">Time: {answer.timeUsed}s / {answer.maxTime}s</Text>
                      </div>
                    </Card>
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
{/* ⭐ NEW: Resume Preview Modal */}
{/* ⭐ ENHANCED: Resume Preview Modal with Original Formatting */}
        {/* ⭐ UPDATED: Resume File Preview Modal */}
        <Modal
          title={`Resume Preview - ${selectedCandidate?.name}`}
          open={resumeModalVisible}
          onCancel={() => setResumeModalVisible(false)}
          footer={[
            <Button 
              key="download" 
              icon={<DownloadOutlined />}
              onClick={() => {
                if (selectedCandidate?.resumeFile?.url) {
                  const link = document.createElement('a');
                  link.href = selectedCandidate.resumeFile.url;
                  link.download = selectedCandidate.resumeFile.name;
                  link.click();
                }
              }}
            >
              Download
            </Button>,
            <Button key="close" onClick={() => setResumeModalVisible(false)}>
              Close
            </Button>
          ]}
          width="90%"
          style={{ top: 20, maxWidth: '1200px' }}
        >
          {selectedCandidate?.resumeFile ? (
            <div style={{ height: '80vh' }}>
              {selectedCandidate.resumeFile.type === 'application/pdf' ? (
                // PDF Preview using iframe
                <iframe
                  src={selectedCandidate.resumeFile.url}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                  title="Resume Preview"
                />
              ) : (
                // DOCX Preview (fallback to text)
                <div style={{ 
                  padding: '20px', 
                  backgroundColor: '#f9f9f9', 
                  borderRadius: '4px',
                  height: '100%',
                  overflow: 'auto'
                }}>
                  <Alert
                    message="DOCX Preview"
                    description="Word document preview is limited in browsers. Click Download to view the full document."
                    type="info"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />
                  <div style={{
                    fontFamily: 'Times, "Times New Roman", serif',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    color: '#333',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '4px'
                  }}>
                    {selectedCandidate.resumeText || 'Preview not available for this document format.'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Empty description="No resume file available" />
          )}
        </Modal>

    </div>
  );
};

export default InterviewerDashboard;
