-- =====================================================
-- CTO Training Content Seed
-- Comprehensive training modules for CTO Portal
-- =====================================================

-- Module 1: CTO Portal Orientation & Overview
INSERT INTO public.cto_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('cto_orientation', 'CTO Portal Orientation & Overview', 'Get started with the CTO Command Center and understand your role, responsibilities, and daily workflow', 1, 30, '/cto-portal')
ON CONFLICT (key) DO NOTHING;

-- Get module ID for lessons
DO $$
DECLARE
  module1_id UUID;
  lesson1_id UUID;
  lesson2_id UUID;
  lesson3_id UUID;
BEGIN
  SELECT id INTO module1_id FROM public.cto_training_modules WHERE key = 'cto_orientation';

  -- Lesson 1.1: Welcome to the CTO Portal
  INSERT INTO public.cto_training_lessons (module_id, title, subtitle, content_markdown, order_index, estimated_minutes)
  VALUES (
    module1_id,
    'Welcome to the CTO Portal',
    'Introduction to your technology command center',
    '# Welcome to the CTO Portal

## Overview

The CTO Portal is your comprehensive technology operations command center. As the Chief Technology Officer, this portal provides you with:

- **Real-time infrastructure monitoring** and health dashboards
- **Team and resource management** tools
- **DevOps and CI/CD pipeline oversight**
- **Security and compliance tracking**
- **Technology roadmap planning**
- **Cost management and optimization**
- **Incident response and management**
- **Code review and development oversight**

## Your Daily Responsibilities

As CTO, you should start each day by:

1. **Morning Technical Review** - Check system health, overnight incidents, and critical alerts
2. **Infrastructure Status** - Review cloud services, databases, and critical systems
3. **Team Performance** - Check sprint progress, code review queue, and developer productivity
4. **Security Alerts** - Review any security incidents or compliance issues
5. **Cost Monitoring** - Check cloud spend and identify optimization opportunities

## Portal Navigation

The portal is organized into several key sections:

- **CTO Command Center** - Your main dashboard with KPIs and alerts
- **Advanced Infrastructure** - Cloud services, databases, and system health
- **DevOps & CI/CD** - Pipeline management and deployment oversight
- **Security & Compliance** - Security monitoring and compliance tracking
- **Team & Resources** - Developer management and resource allocation
- **Technology Roadmap** - Strategic planning and project tracking
- **Tech Cost Management** - Budget tracking and optimization

## Getting Started

Click through each section to familiarize yourself with the interface. The portal is designed to give you a single pane of glass view into all technology operations.

**Next Steps:**
- Explore the CTO Command Center dashboard
- Review the infrastructure health status
- Check your team''s current sprint progress
',
    1,
    15
  ) RETURNING id INTO lesson1_id;

  -- Steps for Lesson 1.1
  INSERT INTO public.cto_training_steps (lesson_id, title, description, order_index, is_required)
  VALUES
    (lesson1_id, 'Navigate to CTO Command Center', 'Click on "CTO Command Center" in the left navigation menu', 1, true),
    (lesson1_id, 'Review the Dashboard Layout', 'Familiarize yourself with the KPI cards, charts, and alert sections', 2, true),
    (lesson1_id, 'Check System Status Indicators', 'Look for any red or yellow status indicators that need attention', 3, true);

  -- Lesson 1.2: Understanding Your Role
  INSERT INTO public.cto_training_lessons (module_id, title, subtitle, content_markdown, order_index, estimated_minutes)
  VALUES (
    module1_id,
    'Understanding Your Role as CTO',
    'Key responsibilities and decision-making authority',
    '# Understanding Your Role as CTO

## Core Responsibilities

As Chief Technology Officer, you are responsible for:

### 1. Technology Strategy
- Define and execute the technology roadmap
- Align technology initiatives with business goals
- Make strategic technology decisions

### 2. Infrastructure Management
- Oversee cloud infrastructure and services
- Ensure system reliability and uptime
- Manage infrastructure costs and optimization

### 3. Team Leadership
- Lead the engineering and development teams
- Manage developer onboarding and growth
- Oversee sprint planning and execution

### 4. Security & Compliance
- Ensure security best practices are followed
- Maintain compliance with regulations
- Respond to security incidents

### 5. Operations Excellence
- Monitor system health and performance
- Manage incidents and outages
- Optimize development workflows

## Decision-Making Authority

You have authority to:
- Approve infrastructure changes and upgrades
- Make technology stack decisions
- Approve security policies and procedures
- Manage team resources and hiring
- Set development standards and practices

## Key Metrics You''ll Monitor

- **System Uptime** - Target: 99.9%+
- **Deployment Frequency** - How often code is deployed
- **Mean Time to Recovery** - How quickly incidents are resolved
- **Security Posture** - Compliance and vulnerability status
- **Team Velocity** - Development team productivity
- **Infrastructure Costs** - Cloud spend and optimization

## Daily Workflow

**Morning (9:00 AM):**
- Review overnight alerts and incidents
- Check system health dashboard
- Review team sprint progress

**Mid-Day:**
- Code review queue oversight
- Infrastructure optimization reviews
- Team standup participation

**Afternoon:**
- Strategic planning and roadmap updates
- Security and compliance reviews
- Cost optimization analysis

**End of Day:**
- Incident review and post-mortems
- Team performance assessment
- Next day planning
',
    2,
    10
  ) RETURNING id INTO lesson2_id;

  -- Lesson 1.3: Portal Navigation
  INSERT INTO public.cto_training_lessons (module_id, title, subtitle, content_markdown, order_index, estimated_minutes)
  VALUES (
    module1_id,
    'Navigating the Portal',
    'How to efficiently move through different sections',
    '# Navigating the CTO Portal

## Left Navigation Menu

The portal uses a persistent left-hand navigation menu with the following sections:

### Primary Sections

1. **CTO Onboarding & Governance** - Initial setup and governance policies
2. **Training** - This training program (you are here!)
3. **CTO Command Center** - Main dashboard with KPIs
4. **Advanced Infrastructure** - Cloud services and system health
5. **DevOps & CI/CD** - Pipeline management
6. **Security & Compliance** - Security monitoring
7. **Team & Resources** - Developer management
8. **Technology Roadmap** - Strategic planning
9. **Tech Cost Management** - Budget and optimization

### Operational Sections

10. **Morning Review** - Daily technical review dashboard
11. **Sprint Management** - Agile sprint oversight
12. **Code Reviews** - Code review queue
13. **IT Help Desk** - Support ticket management
14. **Code Editor** - Direct code editing portal
15. **Developer Onboarding** - New developer setup
16. **Incidents** - Incident management
17. **Assets** - Technology asset tracking

### Communication Sections

18. **Executive Communications** - Email and messaging
19. **Draft Documents** - Document creation
20. **Instruction Manual** - Portal documentation

## Quick Navigation Tips

- **Keyboard Shortcuts**: Use the search functionality to quickly find sections
- **Breadcrumbs**: Use browser back button to return to previous sections
- **Favorites**: Bookmark frequently used sections in your browser
- **Alerts**: Click on alert badges to jump directly to relevant sections

## Dashboard Cards

Most sections contain:
- **KPI Cards** - Key metrics at a glance
- **Data Tables** - Detailed information
- **Charts and Graphs** - Visual representations
- **Action Buttons** - Quick actions and filters

## Best Practices

1. **Start with Command Center** - Always check the main dashboard first
2. **Follow the Alert Trail** - Click through alerts to understand issues
3. **Use Filters** - Most tables have filters to narrow down data
4. **Export Data** - Use export functions for reporting
5. **Set Up Notifications** - Configure alerts for critical issues
',
    3,
    5
  ) RETURNING id INTO lesson3_id;

  -- Steps for Lesson 1.3
  INSERT INTO public.cto_training_steps (lesson_id, title, description, order_index, is_required)
  VALUES
    (lesson3_id, 'Click through each navigation item', 'Visit each section in the left menu to see what''s available', 1, true),
    (lesson3_id, 'Practice using filters', 'In any data table, try using the filter options', 2, false),
    (lesson3_id, 'Explore export options', 'Look for export buttons in tables and dashboards', 3, false);
END $$;

-- Module 2: CTO Command Center Dashboard
INSERT INTO public.cto_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('command_center', 'CTO Command Center Dashboard', 'Master the main dashboard: understanding KPIs, alerts, system health, and how to interpret the data', 2, 35, '/cto-portal')
ON CONFLICT (key) DO NOTHING;

-- Module 3: Infrastructure Management
INSERT INTO public.cto_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('infrastructure', 'Advanced Infrastructure Management', 'Learn to monitor and manage cloud services, databases, and system health', 3, 40, '/cto-portal')
ON CONFLICT (key) DO NOTHING;

-- Module 4: DevOps & CI/CD
INSERT INTO public.cto_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('devops', 'DevOps & CI/CD Pipeline Management', 'Understand deployment pipelines, monitor builds, and manage releases', 4, 35, '/cto-portal')
ON CONFLICT (key) DO NOTHING;

-- Module 5: Security & Compliance
INSERT INTO public.cto_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('security', 'Security & Compliance Center', 'Monitor security posture, vulnerabilities, compliance status, and respond to incidents', 5, 45, '/cto-portal')
ON CONFLICT (key) DO NOTHING;

-- Module 6: Team & Resource Management
INSERT INTO public.cto_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('team_management', 'Team & Resource Management', 'Oversee developers, manage sprints, track performance, and allocate resources', 6, 40, '/cto-portal')
ON CONFLICT (key) DO NOTHING;

-- Module 7: Technology Roadmap & Strategic Planning
INSERT INTO public.cto_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('roadmap', 'Technology Roadmap & Strategic Planning', 'Plan technology initiatives, track projects, and align with business goals', 7, 35, '/cto-portal')
ON CONFLICT (key) DO NOTHING;

-- Module 8: Cost Management & Optimization
INSERT INTO public.cto_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('cost_management', 'Tech Cost Management', 'Monitor cloud spend, identify optimization opportunities, and manage technology budgets', 8, 30, '/cto-portal')
ON CONFLICT (key) DO NOTHING;

-- Module 9: Incident Management
INSERT INTO public.cto_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('incidents', 'Incident Management & Response', 'Respond to outages, manage incidents, conduct post-mortems, and improve reliability', 9, 35, '/cto-portal')
ON CONFLICT (key) DO NOTHING;

-- Module 10: Daily Operations & Workflows
INSERT INTO public.cto_training_modules (key, title, description, order_index, estimated_minutes, associated_route)
VALUES 
  ('daily_operations', 'Daily Operations & Workflows', 'Master your daily routine: morning reviews, code oversight, team management, and end-of-day processes', 10, 40, '/cto-portal')
ON CONFLICT (key) DO NOTHING;



