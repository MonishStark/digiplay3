-- phpMyAdmin SQL Dump
-- version 5.1.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 30, 2023 at 01:10 PM
-- Server version: 10.4.19-MariaDB
-- PHP Version: 8.0.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `team_ai`
--

-- --------------------------------------------------------

--
-- Table structure for table `chat_histories`
--

CREATE TABLE `chat_histories` (
  `id` bigint(11) NOT NULL,
  `userId` bigint(11) DEFAULT NULL,
  `teamId` bigint(11) DEFAULT NULL,
  `name` varchar(300) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `chat_messages`
--

CREATE TABLE `chat_messages` (
  `id` bigint(11) NOT NULL,
  `chatId` bigint(11) DEFAULT NULL,
  `message` varchar(5000) NOT NULL,
  `source` varchar(5000) DEFAULT NULL,
  `role` varchar(10) NOT NULL,
  `parent` bigint(11) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `teams`
--

CREATE TABLE `teams` (
  `id` bigint(11) NOT NULL,
  `companyId` bigint(11) NOT NULL,
  `creatorId` bigint(11) NOT NULL,
  `teamName` varchar(100) NOT NULL,
  `teamAlias` varchar(50) NOT NULL,
  `active` tinyint(1) NOT NULL,
  `uuid` varchar(100) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `id` bigint(11) NOT NULL,
  `adminId` bigint(11) NOT NULL,
  `company_name` varchar(100) DEFAULT NULL,
  `company_phone_country_code` varchar(20) DEFAULT NULL,
  `company_phone` varchar(20) DEFAULT NULL,
  `company_type` varchar(100) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `companies_meta`
--

CREATE TABLE `companies_meta` (
  `id` bigint(11) NOT NULL,
  `companyId` bigint(11) NOT NULL,
  `metaKey` varchar(200) NOT NULL,
  `metaValue` varchar(200) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `id` bigint(11) NOT NULL,
  `userId` bigint(11) NOT NULL,
  `message` varchar(100) NOT NULL,
  `title` varchar(100) NOT NULL,
  `objectId` bigint(11) NOT NULL,
  `type` varchar(100) NOT NULL,
  `isViewed` tinyint(1) NOT NULL  DEFAULT 0,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `file_deletions`
--

CREATE TABLE `file_deletions` (
  `id` bigint(11) NOT NULL,
  `fileId` bigint(11) NOT NULL,
  `uuid` varchar(100) NOT NULL,
  `fileFullName` varchar(100) NOT NULL,
  `notificationId` bigint(11) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for table `file_deletions`
--

ALTER TABLE `file_deletions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for table `file_deletions`
--
ALTER TABLE `file_deletions`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `file_deletions`
--
ALTER TABLE `notification`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

  CREATE TABLE `user_tokens` (
  `id` bigint(11) NOT NULL,
  `userId` bigint(11) DEFAULT NULL,
  `refresh_token`varchar(3000) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


ALTER TABLE `user_tokens`
  ADD PRIMARY KEY (`id`);
  ALTER TABLE `user_tokens`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

  -- --------------------------------------------------------

--
-- Table structure for table `integrations_files_map`
--

CREATE TABLE `integrations_files_map` (
  `id` bigint(11) NOT NULL,
  `userId` bigint(11) DEFAULT NULL,
  `integrationFileId`varchar(300) NOT NULL,
  `internalId` varchar(300) NOT NULL,
  `sourceUrl`varchar(300),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


ALTER TABLE `integrations_files_map`
  ADD PRIMARY KEY (`id`);
-- --------------------------------------------------------
ALTER TABLE `integrations_files_map`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` bigint(11) NOT NULL,
  `parentId` bigint(11) DEFAULT NULL,
  `teamId` bigint(11) DEFAULT NULL,
  `name` varchar(300) NOT NULL,
  `size` varchar(300),
  `creatorId` bigint(11) DEFAULT NULL,
  `tooltip` varchar(300) NOT NULL,
  `isDefault` tinyint(1) NOT NULL,
  `type` varchar(100) NOT NULL,
  `isNotAnalyzed` tinyint(1) NOT NULL  DEFAULT 0,
  `isTrashed` tinyint(1) NOT NULL  DEFAULT 0,
  `source` varchar(20) NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `parentId`, `teamId`, `name`, `tooltip`, `isDefault`, `type`, `created`) VALUES
(4, NULL, NULL, 'Root', 'tooltip', 1, 'folder', '2023-08-22 13:51:49');

-- --------------------------------------------------------

--
-- Table structure for table `file_embedding`
--

CREATE TABLE `file_embedding` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `fileId` bigint(20) NOT NULL,
  `embeddingId` varchar(1000) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invitations`
--

CREATE TABLE `invitations` (
  `id` bigint(11) NOT NULL,
  `sender` bigint(11) NOT NULL,
  `userId` bigint(11) DEFAULT NULL,
  `company` bigint(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `role` bigint(11) NOT NULL,
  `status` varchar(100) NOT NULL,
  `token` bigint(11) DEFAULT NULL,
  `token_issued` varchar(50) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `usage_statistics`
--

CREATE TABLE `usage_statistics` (
  `id` int(11) NOT NULL,
  `statId` int(11) NOT NULL,
  `data` JSON,
  `month` varchar(100) NOT NULL,
  `year` varchar(100) NOT NULL,
  `type`varchar(100) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `file_metadata_retries`
--

CREATE TABLE `file_metadata_retries` (
  `jid` bigint(11) NOT NULL,
  `filePath` varchar(500) DEFAULT NULL,
  `fileFullName` varchar(500) DEFAULT NULL,
  `mimetype` varchar(100) DEFAULT NULL,
  `fileName` varchar(300) DEFAULT NULL,
  `originalname` varchar(300) DEFAULT NULL,
  `teamId` bigint(11) DEFAULT NULL,
  `userId` bigint(11) DEFAULT NULL,
  `company` varchar(300) DEFAULT NULL,
  `uuid` varchar(100) DEFAULT NULL,
  `size` bigint(11) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`jid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `non-response-identifiers`
--

CREATE TABLE `non-response-identifiers` (
  `id` bigint(11) NOT NULL,
  `identifier` varchar(2000) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `non-response-identifiers`
--

INSERT INTO `non-response-identifiers` (`id`, `identifier`) VALUES
(1, 'The context provided does not give any information'),
(2, 'I don\'t have the specific information'),
(3, 'The context provided does not contain information pertaining to your question'),
(4, 'I don\'t know'),
(5, 'I don\'t have the information'),
(6, 'I\'m sorry'),
(7, 'the context provided doesn\'t contain any information'),
(8, 'The context provided does not contain information'),
(9, 'The context provided does not contain specific information'),
(10, 'Apologies'),
(11, 'I don\'t have enough information'),
(12, 'I don\'t have any information'),
(13, 'From the context given, it is not possible to determine'),
(14, 'I apologize'),
(15, 'there is no information given in the context'),
(16, 'I don\'t have enough context'),
(17, 'From the given context, there is no information'),
(18, 'Your last question'),
(19, 'The answer to your last question'),
(20, 'Yes, that is correct.'),
(21, 'How can I assist you'),
(22, 'You said'),
(23, 'Your'),
(24, 'Thank you'),
(25, 'I\'m glad'),
(26, 'if you have any more questions'),
(27, 'if there\'s anything else I can help you with'),
(28, 'feel free to let me know'),
(29, 'Great job'),
(30, 'need further information'),
(31, 'feel free to ask');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint(11) NOT NULL,
  `role` varchar(20) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `role`, `created`, `updated`) VALUES
(1, 'Administrator', '2023-06-19 10:52:27', '2023-06-19 10:52:27'),
(2, 'Standard', '2023-06-19 10:52:27', '2023-06-19 10:52:27'),
(3, 'View Only', '2023-06-19 10:52:27', '2023-06-19 10:52:27'),
(4, 'System Administrator', '2024-01-02 08:56:43', '2024-01-02 08:56:43');

-- --------------------------------------------------------

--
-- Table structure for table `subscription-packages`
--

CREATE TABLE `subscription-packages` (
  `id` bigint(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `priceId` varchar(200) NOT NULL,
  `currency` varchar(5) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `subscription-packages`
--

INSERT INTO `subscription-packages` (`id`, `name`, `priceId`, `currency`, `created`) VALUES
(1, 'solo', 'price_1OSyq5EdBoWbUwLV4hfd0eNz', 'USD', '2023-12-30 11:27:45'),
(2, 'team', 'price_1OSyr9EdBoWbUwLVM5FjkGJM', 'USD', '2023-12-30 11:27:45');

-- --------------------------------------------------------

--
-- Table structure for table `subscriptions`
--

CREATE TABLE `subscriptions` (
  `id` bigint(11) NOT NULL,
  `userId` bigint(11) NOT NULL,
  `payment_id` varchar(100) NOT NULL,
  `subscription_type` varchar(50) NOT NULL,
  `subscription_amount` bigint(7) NOT NULL,
  `currency` varchar(5) NOT NULL,
  `payment_status` tinyint(1) NOT NULL,
  `subscriptionId` varchar(100) NOT NULL,
  `customerId` varchar(100) NOT NULL,
  `paymentMethod`JSON,
  `paymentHistory`JSON,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deactivated` datetime NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `summary`
--

CREATE TABLE `summary` (
  `id` int NOT NULL,
  `fileId` int NOT NULL,
  `teamId` int NOT NULL,
  `fileName` varchar(200) NOT NULL,
  `notes` mediumtext NOT NULL,
  `overview` mediumtext NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `super-admin-settings`
--

CREATE TABLE `super-admin-settings` (
  `id` bigint(11) NOT NULL,
  `meta_key` varchar(100) NOT NULL,
  `meta_value` varchar(10000) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `super-admin-settings`
--

INSERT INTO `super-admin-settings` (`id`, `meta_key`, `meta_value`, `created`) VALUES
(2, 'CHAT_OUTPUT_TOKEN', '2048', '2023-12-23 12:33:39'),
(3, 'CONVERSATION_NUMBER_TO_PASS', '10', '2023-12-01 09:46:05'),
(4, 'NO_OF_CITATIONS', '0', '2024-01-02 11:09:04'),
(7, 'BIGQUERY_FAILURE_RESPONSE', 'I am sorry, I am unable to reach the resource point, please try again.', '2023-12-23 12:33:09'),
(8, 'DEFAULT_CHAT_NAME', 'Chat', '2024-01-02 11:45:03'),
(9, 'FORMAT_CHAT_RESPONSE', '0', '2024-01-02 11:45:03'),
(10, 'FORMAT_SUFFIX', 'Response should be concise', '2024-01-02 11:45:03'),
(11, 'IMAGE_PROMPT', 'Text Recognition:        
- Identify and transcribe all text within the image, including handwritten text.        
- Pay close attention to accuracy, especially for handwritten content.        
- If possible, indicate the location and formatting of the text within the image (e.g., captions, signs, labels).   
     
Scene Understanding:       
- Describe the main actions or events taking place in the image, if any.        - 
- Identify the objects and people present in the image. 
      
 Additional Details:        
- Provide any other relevant information you can glean from the image, such as the overall mood or style (e.g., formal document, casual note, advertisement).        

For best results, prioritize accuracy, especially for text recognition.', '2024-01-02 11:45:03'),
(12, 'AUDIO_PROMPT', 'Task: Analyze the audio file and provide a comprehensive summary, including the following information:
- Key Points: Identify and extract the main points discussed in the meeting or presentation.
- Speaker Identification: If possible, differentiate between speakers and attribute quotes accordingly.
- Action Items: Highlight any actionable items or decisions made during the discussion.
- Timeline: If mentioned, capture the timeline for specific tasks or deliverables.
- Terminology: Identify any domain-specific terminology used in the meeting.
- Sentiment Analysis: Briefly analyze the overall sentiment of the meeting (e.g., positive, negative, neutral).
        
Additional Considerations:
- Focus on clarity and conciseness in presenting the extracted information.
- Organize the information in a way that is easy to understand and navigate.
- Indicate any uncertainties or limitations in the extracted information due to audio quality or background noise.', '2024-01-02 11:45:03'),
(13, 'VIDEO_PROMPT', 'General Instructions:
- Extract as much information as possible from the video, including audio and any visual elements (e.g., slides in a presentation).
- If speaker identification is possible, attribute quotes and actions to specific individuals.
- When possible, provide timestamps for key points in the video for easy reference.

Meeting/Presentation:
- Key Points: Identify and summarize the main points discussed in detail.
- Decisions: Highlight any decisions made, including the context, options presented, and chosen outcome.
- People: Identify participants by name or title (if possible) and their roles in the discussion.
- Projects: If mentioned, identify projects, their goals, and any relevant details.

Narrative (Movie/Story):
- Story Arc: Describe the overall narrative structure, including the beginning, middle, end, and any major turning points.
- Characters: Identify the main characters, their motivations, and relationships to each other.
- Themes: Analyze the underlying themes and messages conveyed in the story.
        
Output:
- A well-structured report summarizing the video content according to the chosen focus (meeting/presentation or narrative).
- Include details as outlined above and organize the information logically.', '2024-01-02 11:45:03'),
(14, 'PDF_PROMPT', 'Task: Generate concise summary points from the provided text.
        Instructions:
           - You will find below the content of a text file. This text describes an experience, event, or article.
           - Read the text carefully and identify the key points.
           - Summarize these key points as brief, informative bullet points.
           - Ensure that each bullet point captures an essential aspect of the text.
           - Aim for clarity, coherence, and conciseness in your summaries.
        File Content:', '2024-01-02 11:45:03'),
(15, 'XLSX_PROMPT', 'Extract the following specific information from the data provided:

Totals and Subtotals:
Calculate the total for each column containing numerical data.
Calculate any subtotals that are specified within the sheet (e.g., by category or group).

Trends and Variances:
Identify any trends in the numerical data over time (e.g., monthly sales data, quarterly performance).
Calculate the variance for each numerical column where applicable. Highlight significant variances.

Summary:
Provide a summary sheet that includes:
A brief description of any identified trends.
Highlight any significant variances and provide possible reasons for these variances.

Ensure all extracted data is accurate and matches the original entries in the data.
Note any inconsistencies or potential errors in the data.

Formatting:
Ensure all extracted data and summaries are well-organized and clearly formatted.
Use appropriate labels and headings for clarity.', '2024-01-02 11:45:03'),
(16, 'DOC_PROMPT', 'Task: Generate concise summary points from the provided text.
        Instructions:
           - You will find below the content of a text file. This text describes an experience, event, or article.
           - Read the text carefully and identify the key points.
           - Summarize these key points as brief, informative bullet points.
           - Ensure that each bullet point captures an essential aspect of the text.
           - Aim for clarity, coherence, and conciseness in your summaries.
        File Content:', '2024-01-02 11:45:03'),
(17, 'PPT_PROMPT', 'Task: Generate concise summary points from the provided text.
        Instructions:
           - You will find below the content of a text file. This text describes an experience, event, or article.
           - Read the text carefully and identify the key points.
           - Summarize these key points as brief, informative bullet points.
           - Ensure that each bullet point captures an essential aspect of the text.
           - Aim for clarity, coherence, and conciseness in your summaries.
        File Content:', '2024-01-02 11:45:03'),
(18, 'MAX_FILE_UPLOADS', '10', '2024-07-14 12:33:09'),
(19,'FILE_UPLOAD_EXPIRY','72','2024-07-14 12:33:09'),
(20,'MAX_STORAGE','5','2024-07-14 12:33:09'),
(21,'MAX_QUERY','1000','2024-07-14 12:33:09'),
(22,'MAX_USERS','10','2024-07-14 12:33:09'),
(23,'MAX_TEAMS','10','2025-10-30 12:33:09'),
(24,'USER_RECORDING_PROMPT','20','2024-07-14 12:33:09'),
(25,'ACTIVE_PAYMENT_CURRENCIES','["USD","INR","GBP","EUR"]','2024-07-14 12:33:09'),
(26,'RECORDING_MONTHLY_LIMIT','30','2024-07-14 12:33:09'),
(27,'DEFAULT_CLOUD_INTEGRATION','1','2024-07-14 12:33:09'),
(28,'CLOUD_INTEGRATION','1','2024-07-14 12:33:09'),
(29,'CLOUD_INTEGRATION_MOBILE','1','2024-07-14 12:33:09'),
(30,'MULTILANGUAGE','1','2024-07-14 12:33:09'),
(31,'PAYMENT_MODE','0','2025-10-30 12:33:09'),
(32,'LOG_LEVEL','debug','2025-10-30 12:33:09');




-- --------------------------------------------------------

--
-- Table structure for table `users_integrations`
--

CREATE TABLE `user_integrations` (
  `id` bigint(11) NOT NULL,
  `userId` bigint(11) NOT NULL,
  `integrationId`varchar(200) NOT NULL,
  `name` varchar(200) NOT NULL,
  `accessToken` varchar(5000) NOT NULL,
  `refreshToken` varchar(5000) NOT NULL,
  `account` varchar(50) NOT NULL,
  `source` varchar(20) NOT NULL,
  `time` datetime NOT NULL,
  `login` tinyint(1),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
--
-- Indexes for table `user_integrations`
--
ALTER TABLE `user_integrations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- AUTO_INCREMENT for table `user_integrations`
--
ALTER TABLE `user_integrations`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

-- --------------------------------------------------------

--
-- Table structure for table `recordings`
--

CREATE TABLE `recordings` (
  `id` bigint(11) NOT NULL,
  `companyId` bigint(11) NOT NULL,
  `userId` bigint(11) NOT NULL,
  `fileId` bigint(11) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `tokens_used`
--

CREATE TABLE `tokens_used` (
  `id` int(11) NOT NULL,
  `chatId` int(11) NOT NULL,
  `token` int(11) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(11) NOT NULL,
  `firstname` varchar(100) NOT NULL,
  `lastname` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `mobileCountryCode` varchar(10) DEFAULT NULL,
  `mobileNumber` varchar(20) NOT NULL,
  `password` varchar(1000) NOT NULL,
  `accountStatus` tinyint(1) NOT NULL,
  `token` bigint(10) DEFAULT NULL,
  `token_issued` varchar(50) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `email_templates`
--

CREATE TABLE `email_templates` (
  `id` bigint(11) NOT NULL,
  `name` varchar(300) NOT NULL,
  `subject` varchar(300) NOT NULL,
  `template` mediumtext NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `email_templates`
--

INSERT INTO `email_templates` (`id`, `name`, `subject`, `template`, `created`) VALUES
(1, 'Welcome', 'Welcome to DigiBot 🐶🚀 {{name}}!', '<p>Hi there, {{name}},</p><p>DigiBot here, your trusty AI assistant and faithful companion at DigiBot! 🐾🚀 I\'m wagging my tail with excitement because you\'ve officially joined our pack, and let me tell you, it\'s going to be a pawsome journey!</p><p>As you embark on your DigiBot adventure, I want to make sure you feel right at home. So here\'s a little welcome package to get you started:</p><p>Explore our platform: Take your time sniffing around and exploring all the nooks and crannies of DigiBot. Just like chasing your favorite toy, there\'s no \"right way\" to do things here. Follow your instincts and have fun!</p><p>Get started with our FAQs: Got questions? No problem! I\'ve fetched some frequently asked questions to help guide you through your DigiBot experience. You can dig into them right here: www.DigiBot.com/faq</p><p>Follow us: Stay connected with our pack and fellow DigiBot users on our LinkedIn, X, Tik Tok, and Instagram pages. It\'s a great way to fetch some tips, tricks, and maybe even a few treats along the way!</p><p>We\'re confident that DigiBot will become your ultimate AI assistant, ready to fetch whatever you need, whenever you need it. But if you ever find yourself in a ruff spot or needing some extra belly rubs, don\'t hesitate to reach out to our support team at support@DigiBot.com. We\'re always here to lend a helping paw!</p><p>Thanks a million for joining our DigiBot family! 🐶🚀</p><p>Wagging tails and virtual belly rubs,</p><p>DigiBot and the DigiBot team&nbsp;</p>', '2023-08-22 13:51:49'),
(2, 'Confirmation', '⚡ Confirm Your Email Address to Get Started! ⚡', '<p>Hey {{name}},</p><p>You and DigiBot are on the brink of some pretty cool stuff, but first things first – we need to make sure we\'re connected!</p><p>Could you please take a quick moment to confirm your email address by clicking the button below?</p><p>{{link}}</p><p>It\'s a tiny step for you, but a giant leap for our journey together. Your confirmation ensures a smooth takeoff 🚀!</p><p>Thanks a ton for your cooperation. If you encounter any hiccups or have questions, don\'t hesitate to reach out.</p><p>Best,</p><p>The DigiBot team 🌟</p>', '2023-08-22 13:51:49'),
(3, 'Invitation', 'Join Our Pack on DigiBot 🐶🚀, {{usermail}}!', '<p>Hey there, {{usermail}},</p><p>I\'m barking up your inbox to extend a paw-some invitation: Join our team workspace on DigiBot! 🐾🚀 We\'re wagging our tails with excitement to have you onboard as we collaborate on essential organization info powered by AI.</p><p>By joining our workspace, you\'ll unlock a whole world of tail-wagging perks, including:</p><p>📁 Access to shared files</p><p>💡 Instant answers to questions on shared info</p><p>🤖 Interactions with multiple AI assistants</p><p>Ready to dive in? Just click on the link below to join our DigiBot pack:</p><p>{{acceptLink}}</p><p>Deny Link:-</p><p>{{denyLink}}</p><p>Once you\'re in, you\'ll have access to all the shared files, projects, and communication channels – it\'s like having a secret clubhouse just for us!</p><p>If you need any help getting started or have questions along the way, don\'t hesitate to reach out to me or [admin\'s name and email]. We\'re here to lend a helping paw whenever you need it.</p><p>We\'re wagging our tails in anticipation of having you collaborate with us on DigiBot!</p><p>Best woofs and tail wags,</p><p>{{sender}}</p>', '2023-08-22 13:51:49'),
(4, 'Reset Password', '🐾 Paws Up for a Password Reset! 🐾', '<p>Hey there {{name}},</p><p>Bark bark! It\'s your furry friend DigiBot here with a wagging tail and a helping paw! Looks like your password\'s been doing some tricks – but no worries, we\'re on the case!</p><p>You know how it is, sometimes those pesky coffee spills or the mysterious office ghost just love to stir things up. But fear not! We\'re here to make it all better.</p><p>Here is your token to change your password: <strong>{{token}}</strong></p><p>To fetch your new password and reclaim your throne, just give that button below a good ol\' click. We\'ll have you back in the game faster than you can chase your own tail!</p><p>{{link}}</p><p>Ta-da! Your fresh password is ready and waiting for you. And hey, if you ever need a belly rub or a game of fetch, we\'re here for that too.</p><p>Keep wagging,</p><p>The DigiBot team 🐶🚀</p>', '2023-08-22 13:51:49'),
(5, 'Cancel Subscription', '🐾 Woof! Your Subscription is Taking a Paws 🐾', '<p>Hey {{name}},</p><p>Woof woof! It\'s me, your friendly neighborhood pup DigiBot, with some news: Your subscription is officially taking a paws. 🐾</p><p>I know, I know, change can be ruff sometimes, but we\'ve got your back! Your cancellation request has been fetched and processed. You\'re officially off the leash from now on.</p><p>Remember, if you ever feel like sniffing around for new adventures again, our door – or should I say, our doggy door – is always open for you. Just give us a bark!</p><p>Wishing you tail wags and belly rubs,</p><p>The DigiBot team 🐶</p>', '2023-08-22 13:51:49'),
(6, 'Account Locked', 'Important Security Notice from Your DigiBot Pal, DigiBot! 🚀🐾', '<p>Woof woof, {{name}}! 🐾</p><p>I just wanted to let you know that something a bit ruff happened with your DigiBot account. It seems like there were a few too many tries with your one-time password (OTP), which is an extra security step we use to keep your account safe. So, for safety\'s sake, we\'ve put a temporary lock on it. Don\'t worry, though! Your account will be wagging its tail again in 12 hours. And while we\'re at it, why not consider giving your password a little makeover? It\'s always good to keep things fresh and secure!</p><p>Sending you tail wags and belly rubs,</p><p>DigiBot 🐶</p>', '2023-08-22 13:51:49'),
(7, 'Invitation Accepted', 'Woof-tastic News: Your DigiBot Pack Just Got Bigger! 🚀🐾', '<p>Hey there, DigiBot pal! 🐾</p><p>I\'ve got paws-itively awesome news to share with you! Your invite to join DigiBot was met with a wagging tail and a big, happy bark from your new pack member, {{name}} ({{email}}). That\'s right – they\'ve accepted your invite and are now officially part of our fetch-tastic family!</p><p>Get ready for even more tail-wagging adventures and exciting fetch missions together. With each new member, our pack grows stronger and our fetch games more fun!</p><p>Keep those tails wagging and those balls flying high,</p><p>Your Buddy DigiBot 🐶</p>', '2023-08-22 13:51:49'),
(8, 'Invitation Declined', 'A Paws for Thought: Your DigiBot Invite Update 🐾', '<p>Hey there, DigiBot friend! 🐾</p><p>Just a quick woof to let you know that we\'ve received an update on your recent invite. Unfortunately, {{name}} ({{email}}) has declined the invitation to join our fetch-tastic pack at this time.</p><p>No worries though! The fun doesn\'t stop here. Keep on fetching, and who knows? Maybe there\'s another furry friend out there ready to join in on the fun and games soon!</p><p>Keep those tails wagging and those balls flying high,</p><p>Your Buddy DigiBot 🐶</p>', '2023-08-22 13:51:49'),
(9, 'OTP', 'Your DigiBot One-Time Password (OTP) 🚀🔑', '<p>Hey there, DigiBot pal! 🐾</p><p>We\'re sending you a special woof to ensure your account stays safe and secure. Below, you\'ll find your one-time password (OTP), designed to add an extra layer of protection to your DigiBot adventures:</p><p>OTP: {{otp}}</p><p>Use this code to access your account securely. Remember, this code is valid for one-time use only and expires in ten minutes, so be sure to use it promptly.</p><p>If you didn\'t request this OTP or have any concerns about your account security, please let us know immediately. Your safety is our top priority!</p><p>Stay pawsitive and secure,</p><p>DigiBot 🐶</p>', '2023-08-22 13:51:49'),
(10, 'Super Admin Created', 'Important Announcement: You\'re Now a Super Admin in DigiBot! 🚀🐾', '<p>Hey there, {{name}}! 🐾</p><p>We\'re thrilled to share some truly exciting news with you. You\'ve been appointed as a Super Admin in DigiBot, which means you now hold the highest level of control and responsibility within our pack. 🎉🐶</p><p>As a Super Admin, you play a pivotal role in shaping the future of DigiBot. Your decisions and actions will directly impact our team and our overall experience. It\'s a big responsibility, but we have every confidence in your ability to lead with wisdom, fairness, and a whole lot of puppy love.</p><p>With great power comes great responsibility, and we know you\'ll embrace this role with the dedication and enthusiasm that make you such a valued member of our pack.</p><p>Whether it\'s managing memberships, assisting users, or ensuring the safety and security of our team, your leadership will be instrumental in guiding DigiBot to new heights.</p><p>Thank you for your commitment to DigiBot and for stepping up to this important role. Together, we\'ll continue to make DigiBot the most paw-some place to be!</p><p>Wagging tails and heartfelt gratitude,</p><p>The DigiBot team 🚀🐾</p>', '2023-08-22 13:51:49'),
(11, 'Transcription Generated', 'File Transcription of {{name}} successfully generate at DigiBot!', '<p>DigiBot here, your trusty AI assistant and faithful companion at DigiBot! 🐾🚀 I am wagging my tail with excitement because your audio recoded file transcription of {{name}} successfully created at DigiBot!</p><p>Thanks a million for joining our DigiBot family! 🐶🚀</p><p>Wagging tails and virtual belly rubs,</p><p>DigiBot and the DigiBot team</p>', '2024-04-19 19:03:23'),
(12, 'Team Invitation', 'Join Digibot 🐶🚀, {{usermail}}!', '<p>Hey there, {{reciever}},</p><p>We hope you are doing well! We are excited to let you know that {{sender}} has granted you access to an exclusive team on Digibot! 🐾🚀 To start exploring the valuable resources and join our collaborative space, you will need to sign up for an account.</p><p>By signing up, you will be able to:</p><p>📁 Access a treasure trove of curated files and resources</p><p>💡 Get instant answers to your questions on shared info</p><p>🤖 Interact with our multiple AI assistants for enhanced productivity</p><p>Ready to get started? Just click on the link below to sign up and join our Digibot pack:</p><p>{{signupLink}}</p><p>If you need any help getting started or have questions along the way, do not hesitate to reach out to our support team at [support email]. We are here to lend a helping paw whenever you need it.</p><p>We are wagging our tails in anticipation of having you collaborate with us on Digibot!</p><p>Best woofs and tail wags,</p><p>The Digibot Team</p>', '2023-08-22 14:51:49');

-- --------------------------------------------------------

--
-- Table structure for table `chat_scope`
--

CREATE TABLE `chat_scope` (
   `id` bigint(11) NOT NULL AUTO_INCREMENT,
  `userId` bigint(11) NOT NULL,
  `teamId` bigint(11) NOT NULL,
  `resourceId` bigint(11) NOT NULL,
  `scope` varchar(200) NOT NULL,
  `chatId` bigint(11) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- --------------------------------------------------------

--
-- Table structure for table `shared_teams`
--

CREATE TABLE `shared_teams` (
  `id` bigint(11) NOT NULL AUTO_INCREMENT,
  `teamId` bigint(11) NOT NULL,
  `ownerId` bigint(11) NOT NULL,
  `sharedUserEmail` varchar(200) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `email_templates`
--
ALTER TABLE `email_templates`
  ADD PRIMARY KEY (`id`);
COMMIT;

-- --------------------------------------------------------

--
-- Table structure for table `users_meta`
--

CREATE TABLE `users_meta` (
  `id` bigint(11) NOT NULL,
  `userId` bigint(11) NOT NULL,
  `metaKey` varchar(200) NOT NULL,
  `metaValue` varchar(200) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `user_company_role_relationship`
--

CREATE TABLE `user_company_role_relationship` (
  `id` bigint(11) NOT NULL,
  `userId` bigint(11) NOT NULL,
  `company` bigint(11) NOT NULL,
  `role` bigint(11) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for table `chat_histories`
--
ALTER TABLE `chat_histories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`),
  ADD KEY `teamId` (`teamId`);

--
-- Indexes for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `chatId` (`chatId`);

--
-- Indexes for table `teams`
--
ALTER TABLE `teams`
  ADD PRIMARY KEY (`id`),
  ADD KEY `companyId` (`companyId`),
  ADD KEY `creatorId` (`creatorId`);

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `adminId` (`adminId`);

--
-- Indexes for table `companies_meta`
--
ALTER TABLE `companies_meta`
  ADD PRIMARY KEY (`id`),
  ADD KEY `companyId` (`companyId`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parentId` (`parentId`),
  ADD KEY `teamId` (`teamId`);

--
-- Indexes for table `invitations`
--
ALTER TABLE `invitations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`),
  ADD KEY `company` (`company`),
  ADD KEY `sender` (`sender`),
  ADD KEY `role` (`role`);

--
-- Indexes for table `usage_statistics`
--
ALTER TABLE `usage_statistics`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `non-response-identifiers`
--
ALTER TABLE `non-response-identifiers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `subscription-packages`
--
ALTER TABLE `subscription-packages`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Indexes for table `summary`
--
ALTER TABLE `summary`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `super-admin-settings`
--
ALTER TABLE `super-admin-settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tokens_used`
--
ALTER TABLE `tokens_used`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users_meta`
--
ALTER TABLE `users_meta`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Indexes for table `user_company_role_relationship`
--
ALTER TABLE `user_company_role_relationship`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`),
  ADD KEY `company` (`company`),
  ADD KEY `role` (`role`);

--
-- Indexes for table `recordings`
--
ALTER TABLE `recordings`
  ADD PRIMARY KEY (`id`);

-- AUTO_INCREMENT for table `recordings`
--
ALTER TABLE `recordings`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `chat_histories`
--
ALTER TABLE `chat_histories`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `chat_messages`
--
ALTER TABLE `chat_messages`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=474;

--
-- AUTO_INCREMENT for table `teams`
--
ALTER TABLE `teams`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `companies_meta`
--
ALTER TABLE `companies_meta`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=483;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=351;

--
-- AUTO_INCREMENT for table `file_embedding`
--
ALTER TABLE `file_embedding`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `invitations`
--
ALTER TABLE `invitations`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=89;

--
-- AUTO_INCREMENT for table `non-response-identifiers`
--
ALTER TABLE `non-response-identifiers`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `subscription-packages`
--
ALTER TABLE `subscription-packages`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `subscriptions`
--
ALTER TABLE `subscriptions`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `summary`
--
ALTER TABLE `summary`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;
COMMIT;

--
-- AUTO_INCREMENT for table `super-admin-settings`
--
ALTER TABLE `super-admin-settings`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `tokens_used`
--
ALTER TABLE `tokens_used`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;
COMMIT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT for table `users_meta`
--
ALTER TABLE `users_meta`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=538;

--
-- AUTO_INCREMENT for table `user_company_role_relationship`
--
ALTER TABLE `user_company_role_relationship`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chat_histories`
--
ALTER TABLE `chat_histories`
  ADD CONSTRAINT `chat_histories_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `chat_histories_ibfk_2` FOREIGN KEY (`teamId`) REFERENCES `teams` (`id`);

--
-- Constraints for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`chatId`) REFERENCES `chat_histories` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teams`
--
ALTER TABLE `teams`
  ADD CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teams_ibfk_2` FOREIGN KEY (`creatorId`) REFERENCES `users` (`id`);

--
-- Constraints for table `companies`
--
ALTER TABLE `companies`
  ADD CONSTRAINT `companies_ibfk_1` FOREIGN KEY (`adminId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `companies_meta`
--
ALTER TABLE `companies_meta`
  ADD CONSTRAINT `companies_meta_ibfk_1` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`parentId`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`teamId`) REFERENCES `teams` (`id`);

--
-- Constraints for table `invitations`
--
ALTER TABLE `invitations`
  ADD CONSTRAINT `invitations_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `invitations_ibfk_2` FOREIGN KEY (`company`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `invitations_ibfk_3` FOREIGN KEY (`sender`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `invitations_ibfk_4` FOREIGN KEY (`role`) REFERENCES `roles` (`id`);

--
-- AUTO_INCREMENT for table `usage_statistics`
--
ALTER TABLE `usage_statistics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

--
-- Constraints for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users_meta`
--
ALTER TABLE `users_meta`
  ADD CONSTRAINT `users_meta_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_company_role_relationship`
--
ALTER TABLE `user_company_role_relationship`
  ADD CONSTRAINT `user_company_role_relationship_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_company_role_relationship_ibfk_2` FOREIGN KEY (`company`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_company_role_relationship_ibfk_3` FOREIGN KEY (`role`) REFERENCES `roles` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
