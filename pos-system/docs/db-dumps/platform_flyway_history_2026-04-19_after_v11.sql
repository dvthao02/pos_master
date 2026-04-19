--
-- PostgreSQL database dump
--

\restrict qnDNGU2U2jkGhbjDzTzKPVoL1cxFoeAiuRdXlXglEibQSwX1QSimIdtwj0btEJw

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: platform; Owner: vanthao
--

INSERT INTO platform.flyway_schema_history VALUES (1, '1', '<< Flyway Baseline >>', 'BASELINE', '<< Flyway Baseline >>', NULL, 'vanthao', '2026-04-18 16:07:12.418235', 0, true);
INSERT INTO platform.flyway_schema_history VALUES (2, '2', 'seed login zone demo accounts', 'SQL', 'V2__seed_login_zone_demo_accounts.sql', 1898831103, 'vanthao', '2026-04-18 16:26:21.976803', 52, true);
INSERT INTO platform.flyway_schema_history VALUES (3, '3', 'seed platform store creator role', 'SQL', 'V3__seed_platform_store_creator_role.sql', -1174330494, 'vanthao', '2026-04-18 17:41:19.315671', 16, true);
INSERT INTO platform.flyway_schema_history VALUES (4, '4', 'seed platform super admin dvthao', 'SQL', 'V4__seed_platform_super_admin_dvthao.sql', 715917043, 'vanthao', '2026-04-18 19:03:46.442178', 19, true);
INSERT INTO platform.flyway_schema_history VALUES (5, '5', 'cleanup test data and create crm views', 'SQL', 'V5__cleanup_test_data_and_create_crm_views.sql', -1752763571, 'vanthao', '2026-04-18 19:03:46.489845', 174, true);
INSERT INTO platform.flyway_schema_history VALUES (6, '6', 'add role permissions table', 'SQL', 'V6__add_role_permissions_table.sql', -1836692537, 'vanthao', '2026-04-18 19:57:07.093307', 79, true);
INSERT INTO platform.flyway_schema_history VALUES (7, '7', 'add crm role permissions table', 'SQL', 'V7__add_crm_role_permissions_table.sql', 2110983472, 'vanthao', '2026-04-18 20:04:27.299611', 183, true);
INSERT INTO platform.flyway_schema_history VALUES (8, '8', 'standardize role scope and defaults', 'SQL', 'V8__standardize_role_scope_and_defaults.sql', 1822405570, 'vanthao', '2026-04-19 09:32:31.318546', 168, true);
INSERT INTO platform.flyway_schema_history VALUES (9, '9', 'backfill role permissions from crm table', 'SQL', 'V9__backfill_role_permissions_from_crm_table.sql', 215311422, 'vanthao', '2026-04-19 09:44:28.650405', 27, true);
INSERT INTO platform.flyway_schema_history VALUES (10, '10', 'auto generate tenant code', 'SQL', 'V10__auto_generate_tenant_code.sql', -677749989, 'vanthao', '2026-04-19 10:15:15.707669', 142, true);
INSERT INTO platform.flyway_schema_history VALUES (11, '11', 'drop legacy crm role permissions table', 'SQL', 'V11__drop_legacy_crm_role_permissions_table.sql', -1738165493, 'vanthao', '2026-04-19 10:20:06.659668', 38, true);


--
-- PostgreSQL database dump complete
--

\unrestrict qnDNGU2U2jkGhbjDzTzKPVoL1cxFoeAiuRdXlXglEibQSwX1QSimIdtwj0btEJw

