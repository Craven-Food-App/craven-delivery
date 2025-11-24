import React, { useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Card,
  Accordion,
  Group,
  Badge,
  Divider,
  List,
  Box,
  Paper,
  Tabs,
  Alert,
  TextInput,
} from '@mantine/core';
import {
  IconBook,
  IconQuestionMark,
  IconInfoCircle,
  IconFileText,
  IconSearch,
} from '@tabler/icons-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface ComponentGuide {
  title: string;
  description: string;
  features: string[];
  howToUse: string[];
  tips: string[];
}

export const CTOPortalInstructionManual: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'How do I access the CTO Portal?',
      answer: 'The CTO Portal is accessible through the main hub. You must have CTO or Technology role permissions. Navigate to the Executive Portals section and select "CTO Portal".',
    },
    {
      question: 'What is the difference between Infrastructure and DevOps?',
      answer: 'Infrastructure Management focuses on service health, cloud resources, and cost optimization. DevOps Dashboard tracks deployment pipelines, build metrics, and CI/CD performance.',
    },
    {
      question: 'How often should I review the CTO Command Center?',
      answer: 'Review the Command Center daily for system health monitoring. The dashboard updates in real-time every 30 seconds with the latest metrics and alerts.',
    },
    {
      question: 'What does "Sprint Velocity" mean?',
      answer: 'Sprint Velocity measures the amount of work (story points) a team completes per sprint. It helps predict future sprint capacity and plan releases.',
    },
    {
      question: 'How do I manage security findings?',
      answer: 'Navigate to Security & Compliance Center > Security Findings. Review findings by severity, update status as you work on them, and track resolution progress.',
    },
    {
      question: 'What is Mean Time to Recovery (MTTR)?',
      answer: 'MTTR measures the average time it takes to recover from a failure or incident. Lower MTTR indicates better incident response and system resilience.',
    },
    {
      question: 'How do I track infrastructure costs?',
      answer: 'Go to Tech Cost Management to view budget vs actuals, vendor spend analysis, and cost trends. Use this to optimize spending and identify cost-saving opportunities.',
    },
    {
      question: 'What is the Technology Roadmap used for?',
      answer: 'The Technology Roadmap shows planned initiatives across quarters, helping you track strategic technology projects, prioritize work, and communicate plans to stakeholders.',
    },
    {
      question: 'How do I monitor service health?',
      answer: 'Use Advanced Infrastructure Management to view service status, uptime percentages, response times, and set up alerts for service degradation.',
    },
    {
      question: 'What are the key metrics on the CTO Command Center?',
      answer: 'Key metrics include: System Uptime, Response Time, Error Rate, Security Score, Deployment Frequency, MTTR, Active Incidents, and Services Operational. These update in real-time.',
    },
    {
      question: 'How do I report an incident?',
      answer: 'Navigate to Incidents > Report Incident. Fill in the title, type, severity, and status. The incident will be tracked and visible to the team.',
    },
    {
      question: 'What is Deployment Frequency?',
      answer: 'Deployment Frequency measures how often code is deployed to production. Higher frequency indicates better DevOps maturity and faster delivery.',
    },
    {
      question: 'How do I manage IT assets?',
      answer: 'Go to Assets to view hardware, software, servers, and network equipment. Track purchase dates, warranty expiration, and asset status.',
    },
    {
      question: 'Can I customize the dashboard?',
      answer: 'The dashboard shows key metrics automatically. You can filter by time period and drill down into specific services or metrics for detailed views.',
    },
    {
      question: 'What should I do if I see a critical anomaly?',
      answer: 'Critical anomalies require immediate attention. Review the alert details, investigate the underlying issue, and take corrective action. Document findings in the system.',
    },
  ];

  const componentGuides: Record<string, ComponentGuide> = {
    'CTO Command Center': {
      title: 'CTO Command Center',
      description: 'The main dashboard providing real-time technology intelligence with predictive analytics, anomaly detection, and comprehensive system health monitoring.',
      features: [
        'Advanced KPIs: System Uptime, Response Time, Error Rate, Security Score, Deployment Frequency, MTTR',
        'Predictive Insights with confidence levels and impact assessment',
        'Anomaly Detection for unusual system patterns',
        '12-Month Performance Trends',
        'System Health Score with visual indicators',
        'Service Status Overview',
        'Real-time data refresh every 30 seconds',
      ],
      howToUse: [
        'Review the KPI cards at the top for key technology metrics',
        'Check Predictive Insights for forward-looking technology insights',
        'Review Anomaly Alerts if any are present',
        'Examine the 12-Month Performance chart for trends',
        'Monitor the System Health Score for overall status',
        'Use Service Status Overview to track service health',
      ],
      tips: [
        'Set up alerts for critical thresholds (e.g., uptime < 99.5%)',
        'Review predictive insights weekly to stay ahead of issues',
        'Investigate anomalies immediately to prevent outages',
        'Export data for executive reports',
      ],
    },
    'Daily Workflow': {
      title: 'Daily Workflow',
      description: 'Structured daily checklist for CTO responsibilities including morning reviews, development leadership, and strategic tasks.',
      features: [
        'Categorized task lists',
        'Priority-based organization',
        'Completion tracking',
        'Task descriptions and guidance',
      ],
      howToUse: [
        'Navigate to Daily Workflow in the sidebar',
        'Review tasks by category',
        'Check off completed tasks',
        'Use task descriptions for guidance',
      ],
      tips: [
        'Complete morning review tasks first',
        'Prioritize high-priority items',
        'Review completed tasks at end of day',
      ],
    },
    'Advanced Infrastructure Management': {
      title: 'Advanced Infrastructure Management',
      description: 'Comprehensive infrastructure monitoring, cloud resource management, and cost optimization.',
      features: [
        'Service Health Monitoring',
        'Cloud Resource Tracking',
        'Cost Analysis and Optimization',
        'Multi-cloud support',
        'Resource utilization tracking',
      ],
      howToUse: [
        'Go to Advanced Infrastructure in the sidebar',
        'View service status and health',
        'Monitor cloud resource utilization',
        'Analyze costs and identify savings',
        'Add or edit services as needed',
      ],
      tips: [
        'Review service health daily',
        'Monitor resource utilization weekly',
        'Optimize costs monthly',
        'Set up alerts for service degradation',
      ],
    },
    'DevOps & CI/CD Dashboard': {
      title: 'DevOps & CI/CD Dashboard',
      description: 'Deployment pipeline visualization, build metrics, and delivery performance tracking.',
      features: [
        'Deployment Frequency tracking',
        'Build Success Rate monitoring',
        'Average Build Duration',
        'Mean Time to Recovery (MTTR)',
        'Deployment history',
        'Build performance trends',
      ],
      howToUse: [
        'Navigate to DevOps & CI/CD Dashboard',
        'Review recent deployments',
        'Check build success rates',
        'Analyze build performance trends',
        'Monitor MTTR for incident response',
      ],
      tips: [
        'Aim for deployment frequency >10/week',
        'Maintain build success rate >95%',
        'Optimize build duration for faster feedback',
        'Track MTTR to improve incident response',
      ],
    },
    'Security & Compliance Center': {
      title: 'Security & Compliance Center',
      description: 'Security posture monitoring, vulnerability management, and compliance framework tracking.',
      features: [
        'Security Score tracking',
        'Vulnerability management',
        'Compliance framework status (SOC 2, ISO 27001, GDPR, PCI DSS)',
        'Security audit findings',
        'Security trend analysis',
      ],
      howToUse: [
        'Go to Security & Compliance Center',
        'Review security findings by severity',
        'Check compliance status across frameworks',
        'Monitor security trends over time',
        'Update finding status as issues are resolved',
      ],
      tips: [
        'Address critical findings immediately',
        'Review compliance status monthly',
        'Track security score trends',
        'Document remediation efforts',
      ],
    },
    'Team & Resource Management': {
      title: 'Team & Resource Management',
      description: 'Developer productivity metrics, sprint velocity tracking, and resource allocation.',
      features: [
        'Team member performance tracking',
        'Sprint velocity metrics',
        'Code review statistics',
        'Resource availability monitoring',
        'Productivity analytics',
      ],
      howToUse: [
        'Navigate to Team & Resource Management',
        'View developer performance metrics',
        'Track sprint velocity trends',
        'Monitor team availability',
        'Analyze productivity patterns',
      ],
      tips: [
        'Use velocity data for sprint planning',
        'Monitor availability for capacity planning',
        'Review code review metrics for quality',
        'Identify productivity bottlenecks',
      ],
    },
    'Technology Roadmap': {
      title: 'Technology Roadmap',
      description: 'Strategic technology planning and innovation pipeline across quarters.',
      features: [
        'Multi-quarter roadmap visualization',
        'Initiative tracking',
        'Priority management',
        'Status tracking (planned, in-progress, completed)',
        'Strategic planning tools',
      ],
      howToUse: [
        'Go to Technology Roadmap',
        'Review initiatives by quarter',
        'Track initiative status',
        'Update priorities as needed',
        'Plan future initiatives',
      ],
      tips: [
        'Review roadmap quarterly',
        'Update status regularly',
        'Prioritize high-impact initiatives',
        'Communicate roadmap to stakeholders',
      ],
    },
    'Tech Cost Management': {
      title: 'Tech Cost Management',
      description: 'Technology budget tracking, vendor spend analysis, and cost optimization.',
      features: [
        'Budget vs Actuals tracking',
        'Vendor spend analysis',
        'Cost trend analysis',
        'Category breakdown',
        'Cost optimization recommendations',
      ],
      howToUse: [
        'Navigate to Tech Cost Management',
        'Review budget vs actuals by category',
        'Analyze vendor spend',
        'Monitor cost trends',
        'Identify cost-saving opportunities',
      ],
      tips: [
        'Review costs monthly',
        'Investigate significant variances',
        'Negotiate vendor contracts',
        'Optimize cloud resource usage',
      ],
    },
  };

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGuides = Object.entries(componentGuides).filter(
    ([title]) => title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box p="md">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={2} mb="xs">
              CTO Portal Instruction Manual
            </Title>
            <Text c="dimmed" size="sm">
              Comprehensive guides and FAQs for all CTO Portal components and Technology Department operations
            </Text>
          </Box>
          <Badge size="lg" color="blue" variant="light" leftSection={<IconBook size={16} />}>
            Documentation
          </Badge>
        </Group>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Getting Started">
          <Text size="sm">
            Use the search function below to find specific topics, or browse through the sections. Each component guide includes features, usage instructions, and helpful tips.
          </Text>
        </Alert>

        <Tabs defaultValue="guides">
          <Tabs.List>
            <Tabs.Tab value="guides" leftSection={<IconFileText size={16} />}>
              Component Guides
            </Tabs.Tab>
            <Tabs.Tab value="faq" leftSection={<IconQuestionMark size={16} />}>
              FAQs
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="guides" pt="md">
            <Stack gap="md">
              <Paper p="md" withBorder>
                <Group>
                  <IconSearch size={20} />
                  <TextInput
                    placeholder="Search component guides..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </Group>
              </Paper>

              <Accordion
                value={expandedSection}
                onChange={setExpandedSection}
                variant="separated"
                radius="md"
              >
                {filteredGuides.map(([title, guide]) => (
                  <Accordion.Item key={title} value={title}>
                    <Accordion.Control>
                      <Group justify="space-between">
                        <Text fw={600}>{guide.title}</Text>
                        <Badge variant="light" color="blue">
                          {guide.features.length} features
                        </Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="md">
                        <Text c="dimmed">{guide.description}</Text>

                        <Divider label="Features" labelPosition="left" />

                        <List spacing="xs" size="sm">
                          {guide.features.map((feature, idx) => (
                            <List.Item key={idx}>{feature}</List.Item>
                          ))}
                        </List>

                        <Divider label="How to Use" labelPosition="left" />

                        <List spacing="xs" size="sm" type="ordered">
                          {guide.howToUse.map((step, idx) => (
                            <List.Item key={idx}>{step}</List.Item>
                          ))}
                        </List>

                        <Divider label="Tips & Best Practices" labelPosition="left" />

                        <List spacing="xs" size="sm">
                          {guide.tips.map((tip, idx) => (
                            <List.Item key={idx} icon={<IconInfoCircle size={14} color="#3b82f6" />}>
                              {tip}
                            </List.Item>
                          ))}
                        </List>
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>

              {filteredGuides.length === 0 && (
                <Card p="xl" withBorder>
                  <Text ta="center" c="dimmed">
                    No component guides found matching "{searchQuery}"
                  </Text>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="faq" pt="md">
            <Stack gap="md">
              <Paper p="md" withBorder>
                <Group>
                  <IconSearch size={20} />
                  <TextInput
                    placeholder="Search FAQs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </Group>
              </Paper>

              <Accordion variant="separated" radius="md">
                {filteredFAQs.map((faq, idx) => (
                  <Accordion.Item key={idx} value={`faq-${idx}`}>
                    <Accordion.Control>
                      <Text fw={500}>{faq.question}</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Text size="sm" c="dimmed">
                        {faq.answer}
                      </Text>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>

              {filteredFAQs.length === 0 && (
                <Card p="xl" withBorder>
                  <Text ta="center" c="dimmed">
                    No FAQs found matching "{searchQuery}"
                  </Text>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Box>
  );
};


