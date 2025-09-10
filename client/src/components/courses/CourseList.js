import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Typography,
  Chip,
  LinearProgress,
  Alert,
  Container,
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  PlayArrow as PlayIcon,
  RestartAlt as ContinueIcon,
  Add as EnrollIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const CourseList = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [userSubscription, setUserSubscription] = useState(null);
  const [planFilteredCourses, setPlanFilteredCourses] = useState([]);

  useEffect(() => {
    // Check if we have a selected plan from dashboard
    const storedPlan = localStorage.getItem('selectedPlan');
    console.log('📋 COURSELIST: Checking for selectedPlan in localStorage');

    if (storedPlan) {
      try {
        const parsedPlan = JSON.parse(storedPlan);
        setSelectedPlan(parsedPlan);
        console.log('✅ COURSELIST: Selected plan loaded from dashboard:', parsedPlan.name);
        console.log('📊 COURSELIST: Plan includes', parsedPlan.includedCourses?.length || 0, 'courses');
      } catch (error) {
        console.error('❌ COURSELIST: Failed to parse selectedPlan from localStorage:', error);
      }
    } else {
      console.log('⚠️ COURSELIST: No selectedPlan found in localStorage');
    }

    fetchCourses();
    fetchUserSubscription();
  }, []);

  useEffect(() => {
    console.log('🔄 COURSELIST: Component mounted or state changed - triggering filter');
    filterCourses();
  }, [courses, searchTerm, difficultyFilter, selectedPlan, userSubscription]);

  useEffect(() => {
    console.log('🌟 COURSELIST: Component mounted');
    console.log('📍 COURSELIST: Current URL:', window.location.href);
    console.log('🔐 COURSELIST: Checking authentication...');
    const token = localStorage.getItem('token');
    console.log('🔑 COURSELIST: Auth token present:', !!token);
  }, []);

  const fetchUserSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/subscription-plans/my-subscription', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setUserSubscription(data);
          console.log('🎯 COURSELIST: User subscription found:', data.subscription?.planName);
          console.log('📋 User granted plan:', data.plan?.name);
          console.log('📊 Plan includes courses count:', data.plan?.includedCourses?.length || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching user subscription:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/courses', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined
        }
      });

      if (!response.ok) throw new Error('Failed to fetch courses');

      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    let filtered = [...courses]; // Start with all courses

    console.log('🔍 CourseList Debug: Starting filtering with', filtered.length, 'courses');
    console.log('🎯 USER SUBSCRIPTION STATUS:', userSubscription ? 'FOUND ✅' : 'NOT FOUND ❌');
    console.log('📋 SELECTED PLAN:', selectedPlan ? selectedPlan.name : 'NONE');

    // 🎯 PRIORITY 1: User's actual subscription - show all courses from their granted plan
    if (userSubscription && userSubscription.plan && userSubscription.plan.includedCourses) {
      console.log('🎯 USING USER SUBSCRIPTION PLAN:', userSubscription.subscription?.planName);
      console.log('📊 User granted plan has', userSubscription.plan.includedCourses.length, 'courses');

      // 🔍 EXTRACT COURSE IDs WITH MAXIMUM VERBOSITY
      console.log('🔍 EXTRACTING COURSE IDs FROM SUBSCRIPTION...');
      console.log('📊 TOTAL COURSES IN SUBSCRIPTION PLAN:', userSubscription.plan.includedCourses.length);

      // Log each course access structure
      userSubscription.plan.includedCourses.forEach((courseAccess, index) => {
        console.log(`\\n🎯 SUBSCRIPTION COURSE #${index + 1}:`);
        console.log('   TYPE:', typeof courseAccess);
        if (typeof courseAccess === 'object') {
          console.log('   KEYS:', Object.keys(courseAccess));
          console.log('   Object structure:', JSON.stringify(courseAccess, null, 2));
        } else {
          console.log('   VALUE:', courseAccess);
        }
      });

      console.log('\\n🎬 PROCESSING EACH SUBSCRIPTION COURSE:');
      const grantedPlanCourseIds = userSubscription.plan.includedCourses.map((courseAccess, index) => {
        console.log(`\\n🔧 PROCESSING COURSE #${index + 1}:`);
        console.log('   Input type:', typeof courseAccess);

        // Handle populated course objects
        if (courseAccess && courseAccess.courseId && typeof courseAccess.courseId === 'object') {
          console.log('   🎯 CASE: Populated course object detected');
          console.log('   Course title:', courseAccess.courseId.title);
          console.log('   Course ID:', courseAccess.courseId._id);
          return courseAccess.courseId._id.toString();
        }
        // Handle string IDs
        if (typeof courseAccess === 'string') {
          console.log('   🎯 CASE: Direct string ID');
          console.log('   String ID:', courseAccess);
          return courseAccess;
        }
        // Handle object with _id
        if (courseAccess && courseAccess._id) {
          console.log('   🎯 CASE: Object with _id property');
          console.log('   Object _id:', courseAccess._id);
          return courseAccess._id.toString();
        }
        // Handle nested course access
        if (courseAccess && typeof courseAccess === 'object' && courseAccess.courseName) {
          console.log('   🎯 CASE: Embedded course access object');
          console.log('   Course name:', courseAccess.courseName);
          if (courseAccess.courseId) {
            console.log('   Course ID within object:', courseAccess.courseId);
            return courseAccess.courseId.toString();
          }
        }
        // Fallback
        const fallbackId = courseAccess?.toString();
        console.log('   ⚠️ CASE: Fallback processing');
        console.log('   Fallback ID:', fallbackId);
        if (fallbackId === '[object Object]') {
          console.log('   🚨 ERROR: Object toString resulted in [object Object]');
          console.log('   Original object:', courseAccess);
        }
        return fallbackId;
      }).filter(id => id && id !== '[object Object]');

      console.log('\\n🎯 FINAL EXTRACTED IDs:');
      grantedPlanCourseIds.forEach((id, index) => {
        console.log(`   ${index + 1}. "${id}"`);
      });
      console.log(`\\n✅ TOTAL VALID IDs EXTRACTED: ${grantedPlanCourseIds.length}`);

      console.log('✅ GRANTED PLAN COURSE IDs:', grantedPlanCourseIds);

      // 🔍 DETAILED COURSE MATCHING ANALYSIS
      console.log('\\n🔍 COURSE MATCHING ANALYSIS:');
      console.log('📚 AVAILABLE DATABASE COURSES:');
      courses.forEach((course, idx) => {
        console.log(`   ${idx + 1}. "${course.title}" - ID: "${course._id}"`);
      });

      console.log('\\n🎯 MATCHING PERMITTED COURSE IDs:');
      grantedPlanCourseIds.forEach((id, idx) => {
        console.log(`   ${idx + 1}. "${id}"`);
      });

      console.log('\\n🚀 COURSE-BY-COURSE MATCHING RESULTS:');
      let matchedCourses = [];
      let unmatchedCourses = [];

      filtered = filtered.filter(course => {
        const courseId = course._id?.toString();
        const isGranted = grantedPlanCourseIds.some(permId => {
          const matches = permId === courseId;
          if (matches) {
            console.log(`   ✅ MATCH: "${course.title}" (${courseId}) === "${permId}"`);
          }
          return matches;
        });

        if (isGranted) {
          console.log(`   🎉 GRANTED: "${course.title}"`);
          matchedCourses.push(course);
        } else {
          console.log(`   🚫 EXCLUDED: "${course.title}" (ID: ${courseId}) - No matching permission ID found`);
          console.log(`      ✅ Looking for ID in permissions: ${grantedPlanCourseIds.includes(courseId) ? 'FOUND' : 'NOT FOUND'}`);
          unmatchedCourses.push(course);
        }

        return isGranted;
      });

      console.log('\\n🏆 MATCHING SUMMARY:');
      console.log(`   📊 COURSES IN USER'S PLAN: ${grantedPlanCourseIds.length}`);
      console.log(`   ✅ MATCHED COURSES: ${matchedCourses.length}`);
      console.log(`   ❌ UNMATCHED COURSES: ${unmatchedCourses.length}`);

      if (unmatchedCourses.length > 0) {
        console.log('\\n🚨 UNMATCHED COURSE DETAILS:');
        unmatchedCourses.forEach((course, idx) => {
          console.log(`   ${idx + 1}. "${course.title}" (ID: "${course._id}")`);
          const availablePerms = grantedPlanCourseIds.filter(permId => permId === course._id.toString());
          console.log(`      Available permissions for this ID: ${availablePerms.length}`);
          if (availablePerms.length === 0) {
            console.log('      💡 THIS COURSE IS MISSING FROM USER\'S PLAN PERMISSIONS!');
          }
        });
      }

      // Show missing courses analysis
      const totalExpectedCourses = userSubscription.plan.includedCourses.length;
      if (filtered.length < totalExpectedCourses) {
        console.log('\\n🚨 MISSING COURSE ANALYSIS:');
        console.log(`   Expected from plan: ${totalExpectedCourses}`);
        console.log(`   Actually found in DB: ${filtered.length}`);
        console.log(`   Missing from plan: ${totalExpectedCourses - filtered.length} courses`);

        const expectedCourseNames = userSubscription.plan.includedCourses.map((access, idx) => {
          if (access.courseId && typeof access.courseId === 'object') {
            return access.courseId.title;
          } else if (access.courseName) {
            return access.courseName;
          } else {
            return `Course ${idx + 1}`;
          }
        });

        console.log('\\n📋 COURSES THAT SHOULD BE IN PLAN:');
        expectedCourseNames.forEach((name, idx) => {
          console.log(`   ${idx + 1}. "${name}"`);
        });

        console.log('\\n📋 COURSES ACTUALLY FOUND:');
        filtered.forEach((course, idx) => {
          console.log(`   ${idx + 1}. "${course.title}"`);
        });

        const foundCourseNames = filtered.map(c => c.title);
        const missingCourseNames = expectedCourseNames.filter(name =>
          !foundCourseNames.some(foundName => foundName === name)
        );

        if (missingCourseNames.length > 0) {
          console.log('\\n💥 IDENTIFIED MISSING COURSES:');
          missingCourseNames.forEach((name, idx) => {
            console.log(`   ${idx + 1}. "${name}" - THIS COURSE IS NOT FOUND IN DATABASE!`);
          });
        }
      }

      console.log('🎯 FINAL: User sees', filtered.length, 'courses from their granted plan');
      console.log('🎯 Expected:', userSubscription.plan.includedCourses.length, 'courses');

      const planExpectedCount = userSubscription.plan.includedCourses.length;

      // ✅ SUCCESS VERIFICATION
      if (filtered.length === planExpectedCount) {
        console.log('✅ SUCCESS! ALL GRANTED COURSES WILL BE DISPLAYED');
        console.log(`🎯 UI will show: "${filtered.length} of ${planExpectedCount} courses accessible"`);

        console.log('\\n🏆 COURSES FROM USER\'s GRANTED PLAN:');
        filtered.forEach((course, index) => {
          console.log(`   ⭐ ${index + 1}. "${course.title}"`);
        });
 
        // 🔍 AUTOMATED DEBUG: Specific course matching analysis
        console.log('\\n🔍 AUTOMATED DEBUG: Checking course match failures...');
        const expectedIds = userSubscription.plan.includedCourses.map(courseAccess => {
          if (courseAccess && courseAccess.courseId && typeof courseAccess.courseId === 'object') {
            return courseAccess.courseId._id?.toString();
          }
          if (typeof courseAccess === 'string') {
            return courseAccess;
          }
          if (courseAccess && courseAccess._id) {
            return courseAccess._id?.toString();
          }
          return courseAccess?.toString();
        }).filter(id => id && id !== '[object Object]').slice(0, 4); // Limit to Premium plan courses
 
        console.log('📋 Expected IDs:', expectedIds);
        console.log('✅ Matched Count:', filtered.length);
 
        const actualIds = filtered.map(course => course._id?.toString());
        const missingIds = expectedIds.filter(id => !actualIds.includes(id));
 
        console.log('🎯 Actual IDs shown:', actualIds);
 
        if (missingIds.length > 0) {
          console.log('🚨 MISSING IDs:', missingIds);
          console.log('\\n⚠️  ROOT CAUSE ANALYSIS:');
          console.log('   • These courses are in your Premium plan but not found in database');
          console.log('   • Check subscription plan data vs database consistency');
          console.log('   • May need database sync or plan data rebuild');
        } else {
          console.log('✅ SUCCESS: All Premium plan courses found!');
        }

        console.log('\\n🎊 CONFIRMATION: User subscription is working perfectly!');
      } else {
        console.log('❌ ISSUE DETECTED: Missing courses from user\'s granted plan!');
        console.log(`📊 UI will show: "${filtered.length} of ${planExpectedCount} courses accessible"`);
        console.log(`📊 Missing: ${planExpectedCount - filtered.length} course(s)`);
      }

      // END OF USER SUBSCRIPTION FILTER - SUCCESS
      setFilteredCourses(filtered);
      if (selectedPlan) setPlanFilteredCourses(filtered);
      return;
    }

    // 🎯 PRIORITY 2: Fallback to selected plan (no user subscription)
    else if (selectedPlan && selectedPlan.includedCourses && selectedPlan.includedCourses.length > 0) {
      console.log('⚠️ FALLBACK: No user subscription found - using dashboard clicked plan:', selectedPlan.name);
      console.log('📊 Fallback selected plan has', selectedPlan.includedCourses.length, 'courses');

      console.log('🔍 RAW PLAN INCLUDES POC');
      selectedPlan.includedCourses.forEach((courseAccess, index) => {
        console.log(`   ${index + 1}. RAW ENTRY:`, courseAccess);
        console.log(`      Type: ${typeof courseAccess}`);
        console.log(`      Keys:`, typeof courseAccess === 'object' ? Object.keys(courseAccess) : 'N/A');
      });

      // Handle different possible structures: courseAccess objects with courseId, or direct course IDs
      const planCourseIds = selectedPlan.includedCourses.map(courseAccess => {
        console.log('🚀 Processing courseAccess:', courseAccess);

        // If courseAccess is an object with courseId property
        if (typeof courseAccess === 'object' && courseAccess.courseId) {
          console.log('📋 Found courseId property:', courseAccess.courseId);
          return typeof courseAccess.courseId === 'object' ? courseAccess.courseId._id : courseAccess.courseId;
        }
        // If courseAccess is a direct string/primitive ID
        if (typeof courseAccess === 'string') {
          console.log('📋 Direct string ID:', courseAccess);
          return courseAccess;
        }
        // If courseAccess is an object (like from MongoDB _id)
        if (courseAccess && courseAccess._id) {
          console.log('📋 Found _id property:', courseAccess._id);
          return courseAccess._id;
        }
        // Fallback to toString
        const fallbackId = courseAccess?.toString();
        console.log('📋 Fallback ID:', fallbackId);
        return fallbackId;
      }).filter(id => id && id !== '[object Object]');

      console.log('✅ FINAL EXTRACTED COURSE IDs:', planCourseIds);
      console.log('📋 Course IDs in plan:', planCourseIds.length);

      // Log all available courses for comparison
      console.log('📚 ALL COURSES IN DATABASE:');
      courses.forEach((course, index) => {
        console.log(`   ${index + 1}. "${course.title}" (ID: ${course._id})`);
      });

      // Now filter based on plan
      console.log('🎯 STARTING COURSE MATCHING...');
      let planMatchedCourses = [];

      filtered = filtered.filter(course => {
        const courseId = course._id?.toString();
        const foundInPlan = planCourseIds.some(planId => {
          const planIdStr = planId?.toString();
          const matches = planIdStr === courseId;
          if (matches) {
            console.log(`✅ MATCH FOUND: "${course.title}" (${courseId}) === ${planIdStr}`);
            planMatchedCourses.push(course);
          } else {
            console.log(`❌ NO MATCH: "${course.title}" (${courseId}) !== ${planIdStr}`);
          }
          return matches;
        });

        if (foundInPlan) {
          console.log(`❤️ INCLUDED: "${course.title}"`);
        } else {
          console.log(`🚫 EXCLUDED: "${course.title}"`);
        }
        return foundInPlan;
      });

      console.log('🎉 COURSE MATCHING COMPLETE:');
      console.log(`   - Plan specifies: ${planCourseIds.length} courses`);
      console.log(`   - Found in database: ${planMatchedCourses.length} courses`);
      console.log(`   - Final filtered count: ${filtered.length} courses`);

      console.log('📊 FINAL RESULTS:');
      if (planMatchedCourses.length === planCourseIds.length) {
        console.log('✅ SUCCESS: All plan courses found and will be displayed!');
        console.log('✨ User will see all plan-related course cards');
      } else {
        console.log('⚠️  WARNING: Some courses may be missing');
        console.log('🔍 This could be due to:');
        console.log('   - Courses deleted but references still exist');
        console.log('   - Course IDs mismatch between plan and database');
        console.log('   - Database inconsistency');
      }

      planMatchedCourses.forEach((course, index) => {
        console.log(`   + ${index + 1}. "${course.title}" (ID: ${course._id})`);
      });

      // Final verification for user display
      const expectedCount = selectedPlan.includedCourses?.length || 0;
      console.log('\n🎯 FINAL VERIFICATION:');
      if (filtered.length === expectedCount) {
        console.log('✅ EXCELLENT: All plan courses will be displayed!');
        console.log(`🎯 UI will show: "${filtered.length} of ${expectedCount} courses accessible"`);

        // List the courses for confirmation
        console.log('\n🏆 COURSES THAT WILL BE DISPLAYED:');
        filtered.forEach((course, index) => {
          console.log(`   ⭐ ${index + 1}. "${course.title}"`);
        });

        console.log('\n🎊 SUCCESS: Premium CyberSecurity Pro Plan will show ALL its courses!');
        console.log('🎊 User will see complete course collection');

      } else {
        console.log('⚠️  ISSUE DETECTED: Course count mismatch!');
        console.log(`📊 UI will show: "${filtered.length} of ${expectedCount} courses accessible"`);
        console.log(`📊 Missing: ${expectedCount - filtered.length} course(s)`);

        console.log('\n🔍 POSSIBLE CAUSES:');
        console.log('   • Some courses may have been deleted from database');
        console.log('   • Course IDs in plan may not match actual courses');
        console.log('   • Plan data may be corrupted or outdated');

        console.log('\n🛠️  RECOMMENDATIONS:');
        console.log('   • Check browser console for detailed logging');
        console.log('   • Verify courses exist in database');
        console.log('   • Consider plan data sync/rebuild');
      }

      // Success/failure indicator
      const successIndicator = filtered.length === expectedCount ? '🎉 SUCCESS' : '⚠️  PARTIAL';
      const coveragePercent = expectedCount > 0 ? Math.round((filtered.length / expectedCount) * 100) : 0;
      console.log(`\n${successIndicator}: ${coveragePercent}% course coverage for Premium CyberSecurity Pro Plan`);

    } else {
      console.log('🏠 NO PLAN SELECTED - SHOWING ALL COURSES:', filtered.length);
      console.log('📚 AVAILABLE COURSES:');
      filtered.forEach((course, index) => {
        console.log(`   ${index + 1}. "${course.title}" (ID: ${course._id})`);
      });

      console.log('\n🎯 SUMMARY:');
      console.log('   All courses will be displayed (browsing mode)');
      console.log('   UI will show:', `\"${filtered.length} course${filtered.length !== 1 ? 's' : ''} found\"`);
    }

    // 🚨 CRITICAL: Prevent secondary filters from removing premium courses
    console.log('🚨 FILTER VERIFICATION BEFORE ADDITIONAL FILTERS:');
    console.log('Current filtered count:', filtered.length);
    console.log('Search term:', searchTerm || 'NONE');
    console.log('Difficulty filter:', difficultyFilter || 'ALL');

    // 🔍 Search filter (WARNING: may remove courses from premium plan)
    if (searchTerm && searchTerm.trim() !== '') {
      const preSearchCount = filtered.length;
      console.log('🚨 APPLYING SEARCH FILTER - THIS MAY REMOVE PREMIUM COURSES!');
      console.log('🔎 Searching for:', searchTerm);

      filtered = filtered.filter(course => {
        const searchLower = searchTerm.toLowerCase();
        const matches = course.title?.toLowerCase().includes(searchLower) ||
                        course.description?.toLowerCase().includes(searchLower) ||
                        course.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        if (!matches) {
          console.log(`🚨 SEARCH EXCLUDING PREMIUM COURSE: "${course.title}"`);
        }
        return matches;
      });

      console.log(`🔍 SEARCH FILTER REMOVED ${preSearchCount - filtered.length} courses!`);
      console.log('🔍 After search filter:', filtered.length, 'courses remain');

      if (filtered.length < preSearchCount) {
        console.log('⚠️  CRITICAL: Search filter is removing premium courses!');
        console.log('💡 SOLUTION: Clear search term or modify search logic to not filter premium courses');
      }
    }

    // 🔍 Difficulty filter (WARNING: may remove courses from premium plan)
    if (difficultyFilter && difficultyFilter !== 'all') {
      const preDifficultyCount = filtered.length;
      console.log('🚨 APPLYING DIFFICULTY FILTER - THIS MAY REMOVE PREMIUM COURSES!');
      console.log('🎯 Filtering by difficulty:', difficultyFilter);

      filtered = filtered.filter(course => {
        const matches = course.difficulty === difficultyFilter;
        if (!matches) {
          console.log(`🚨 DIFFICULTY EXCLUDING PREMIUM COURSE: "${course.title}" (${course.difficulty})`);
        }
        return matches;
      });

      console.log(`🔍 DIFFICULTY FILTER REMOVED ${preDifficultyCount - filtered.length} courses!`);
      console.log('🔍 After difficulty filter:', filtered.length, 'courses remain');

      if (filtered.length < preDifficultyCount) {
        console.log('⚠️  CRITICAL: Difficulty filter is removing premium courses!');
        console.log('💡 SOLUTION: Use "All Levels" filter or modify to not filter premium courses');
      }
    }

    // Sort by enrollment count (most popular first)
    filtered.sort((a, b) => (b.enrollments || 0) - (a.enrollments || 0));

    console.log('✅ Final filtered results:', filtered.length, 'courses');
    setFilteredCourses(filtered);

    if (selectedPlan) {
      setPlanFilteredCourses(filtered);
    }
  };

  // 🔧 DEBUGGING FUNCTION: Verify all plan courses are displayed
  const verifyPlanCourses = () => {
    console.log('🔍 VERIFICATION: Starting verification analysis...');

    // 🚨 CHECK FOR VERIFICATION DATA MISMATCH
    console.log('📊 VERIFICATION DATA CHECK:');
    console.log(' userSubscription present:', !!userSubscription);
    console.log(' selectedPlan present:', !!selectedPlan);

    if (!selectedPlan && !userSubscription) {
      console.log('🔍 VERIFICATION: No selected plan AND no user subscription - showing all courses');
      console.log(`🔍 Total courses available: ${courses.length}`);
      return;
    }

    // 🚨 CRITICAL MISMATCH DETECTED
    if (userSubscription && selectedPlan && userSubscription.plan?.includedCourses?.length !== selectedPlan.includedCourses?.length) {
      console.log('🚨 CRITICAL VERIFICATION MISMATCH DETECTED!');
      console.log('User Subscription Plan:', userSubscription.plan?.name);
      console.log('User Subscription Courses:', userSubscription.plan?.includedCourses?.length);
      console.log('Selected Plan:', selectedPlan?.name);
      console.log('Selected Plan Courses:', selectedPlan.includedCourses?.length);
      console.log('🎯 FILTERING USES USER SUBSCRIPTION, BUT VERIFICATION USES SELECTED PLAN!');
      console.log('💡 THIS IS THE ROOT CAUSE OF THE MISMATCH!');
    }

    // Use correct data source for verification
    const planToCheck = userSubscription && userSubscription.plan ? userSubscription.plan : selectedPlan;
    const planName = planToCheck.name;

    console.log('🔍 VERIFICATION: Checking Plan Courses');
    console.log(`📋 Plan: ${planName}`);
    console.log(`📊 Plan expects: ${planToCheck.includedCourses?.length || 0} courses`);
    console.log(`📊 UI shows: ${filteredCourses.length} courses`);
    console.log(`🎯 Match: ${filteredCourses.length === (planToCheck.includedCourses?.length || 0) ? '✅ PERFECT' : '❌ MISMATCH'}`);

    if (filteredCourses.length === (planToCheck.includedCourses?.length || 0)) {
      console.log('🎊 SUCCESS: Plan will display ALL its courses!');
      console.log('🎊 User experience: Complete and seamless course access');
    } else {
      console.log('⚠️  ATTENTION: Some courses missing - check debugging logs above');
      console.log('🔍 DID YOU SEE ANY "FILTER EXCLUDING PREMIUM COURSE" messages?');
    }
  };

  // Auto-verify when plan is selected
  React.useEffect(() => {
    if (selectedPlan && courses.length > 0) {
      setTimeout(() => verifyPlanCourses(), 1000); // Small delay for filtering to complete
    }
  }, [selectedPlan, courses, filteredCourses]);

  const handleEnroll = async (course) => {
    console.log('🚀 ENROLLMENT ATTEMPT:');
    console.log('Course ID:', course._id);
    console.log('Course has access:', course.hasAccess);
    console.log('Course is enrolled:', course.isEnrolled);
    console.log('Course slug:', course.slug);

    if (!course.hasAccess) {
      console.log('⚠️  No access - redirecting to subscription plans');
      navigate('/subscription-plans');
      return;
    }

    if (course.isEnrolled) {
      console.log('✅ Already enrolled - navigating to course');
      navigate(`/course/${course.slug}`);
    } else {
      try {
        const token = localStorage.getItem('token');
        const courseId = course._id;

        console.log('🔐 Authentication token present:', !!token);
        console.log('📝 Request details:');
        console.log('   URL:', `/api/courses/${courseId}/enroll`);
        console.log('   Method: POST');
        console.log('   Headers:', {
          'Authorization': token ? 'Bearer [TOKEN_PRESENT]' : 'No token',
          'Content-Type': 'application/json'
        });

        if (!token) {
          console.error('❌ NO AUTHENTICATION TOKEN!');
          setError('You must be logged in to enroll in courses.');
          return;
        }

        if (!courseId) {
          console.error('❌ MISSING COURSE ID!');
          setError('Course ID is missing. Please try again.');
          return;
        }

        const response = await fetch(`/api/courses/${courseId}/enroll`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: '{}' // Empty body is sometimes required
        });

        console.log('📥 Response received:');
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        console.log('OK:', response.ok);

        if (!response.ok) {
          try {
            const errorData = await response.json();
            console.error('❌ Server error response:', errorData);
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          } catch (parseError) {
            console.error('❌ Failed to parse error response:', parseError);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }

        const data = await response.json();
        console.log('✅ Enrollment successful!');
        console.log('Response data:', data);

        // Refresh courses to update enrollment status
        console.log('🔄 Refreshing course list...');
        await fetchCourses();

        console.log('🎉 ENROLLMENT PROCESS COMPLETED!');
        setError(''); // Clear any previous errors

      } catch (error) {
        console.error('💥 ENROLLMENT FAILED:');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Full error:', error);

        let userMessage = 'Failed to enroll in course. ';

        // Provide specific error messages based on error type
        if (error.message.includes('401')) {
          userMessage += 'Please log in again.';
        } else if (error.message.includes('403')) {
          userMessage += 'You don\'t have access to this course.';
        } else if (error.message.includes('404')) {
          userMessage += 'Course not found.';
        } else if (error.message.includes('500')) {
          userMessage += 'Server error. Please try again later.';
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          userMessage += 'Connection error. Check your internet connection.';
        } else {
          userMessage += 'Please try again later.';
        }

        console.log('📤 User message set:', userMessage);
        setError(userMessage);
      }
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      Beginner: 'success',
      Intermediate: 'warning',
      Advanced: 'error',
      Expert: 'secondary'
    };
    return colors[difficulty] || 'default';
  };

  const getCourseButtonProps = (course) => {
    if (!course.hasAccess) {
      return {
        label: 'Upgrade Required',
        startIcon: <FilterIcon />,
        variant: 'outlined',
        color: 'secondary'
      };
    }

    if (course.isEnrolled) {
      if (course.progress > 0) {
        return {
          label: 'Continue Learning',
          startIcon: <ContinueIcon />,
          variant: 'contained',
          color: 'primary'
        };
      } else {
        return {
          label: 'Start Learning',
          startIcon: <PlayIcon />,
          variant: 'contained',
          color: 'primary'
        };
      }
    }

    return {
      label: 'Enroll Now',
      startIcon: <EnrollIcon />,
      variant: 'contained',
      color: 'primary'
    };
  };

 if (loading) {
   return (
     <div style={{
       minHeight: '100vh',
       background: '#0a1121',
       color: '#e0e0e0',
       fontFamily: "'Roboto', sans-serif",
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'center',
       padding: '20px'
     }}>
       <style>
         {`
           @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;900&family=Roboto:wght@300;400;500;700&display=swap');

           .loading-spinner {
             display: inline-block;
             width: 60px;
             height: 60px;
             border: 6px solid rgba(10, 17, 33, 0.3);
             border-radius: 50%;
             border-top-color: #00ff88;
             animation: spin 1s ease-in-out infinite;
           }

           @keyframes spin {
             to { transform: rotate(360deg); }
           }
         `}
       </style>
       <div style={{ textAlign: 'center' }}>
         <div className="loading-spinner"></div>
         <div style={{
           marginTop: '20px',
           color: '#00ff88',
           fontFamily: 'Orbitron, sans-serif',
           fontSize: '1.2rem'
         }}>
           Loading Courses...
         </div>
       </div>
     </div>
   );
 }

 return (
   <div style={{
     minHeight: '100vh',
     background: '#0a1121',
     color: '#e0e0e0',
     fontFamily: "'Roboto', sans-serif",
     padding: '20px'
   }}>
     <style>{`
       @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;900&family=Roboto:wght@300;400;500;700&display=swap');

       .courses-container {
         max-width: 1400px;
         margin: 0 auto;
         padding: 20px;
         width: 100%;
         box-sizing: border-box;
         overflow-x: hidden; /* Prevent horizontal overflow */
       }

       .courses-header {
         text-align: center;
         margin-bottom: 40px;
         position: relative;
         z-index: 1;
       }

       .courses-title {
         font-family: 'Orbitron', sans-serif;
         font-size: 3.2rem;
         background: linear-gradient(135deg, #00ff88 0%, #39ff14 50%, #9742f5 100%);
         -webkit-background-clip: text;
         -webkit-text-fill-color: transparent;
         background-clip: text;
         margin-bottom: 15px;
         text-shadow: 0 0 30px rgba(0, 255, 136, 0.8);
         font-weight: 700;
         letter-spacing: 1px;
       }

       .back-button {
         background: linear-gradient(135deg, #00aaff 0%, #0066cc 100%);
         color: '#fff';
         border: none;
         border-radius: 25px;
         padding: 12px 25px;
         font-family: 'Orbitron', sans-serif;
         font-size: 0.9rem;
         font-weight: bold;
         cursor: pointer;
         transition: all 0.3s ease;
         margin-right: 15px;
         text-transform: none;
       }

       .back-button:hover {
         transform: translateY(-2px);
         box-shadow: 0 8px 25px rgba(0, 170, 255, 0.4);
         background: linear-gradient(135deg, #0066cc 0%, #004d99 100%);
       }

       .plan-chip {
         background: linear-gradient(135deg, #00ff88 0%, #39ff14 100%);
         color: '#0a1121';
         font-weight: bold;
         padding: 8px 20px;
         border-radius: 20px;
         font-family: 'Orbitron', sans-serif;
       }

       .courses-subtitle {
         font-family: 'Roboto', sans-serif;
         font-size: 1.2rem;
         color: '#e0e0e0';
         line-height: 1.7;
         margin: 20px 0;
         text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
       }

       .course-card {
         background: linear-gradient(145deg, #0d1b2a 0%, #1e293b 50%, #111c30 100%);
         border: 1px solid #2a4060;
         border-radius: 20px;
         padding: 0;
         transition: all 0.5s cubic-bezier(0.23, 1, 0.320, 1);
         position: relative;
         overflow: hidden;
         height: 100%;
         display: flex;
         flex-direction: column;
         box-shadow:
           0 8px 32px rgba(0, 0, 0, 0.4),
           0 2px 8px rgba(0, 170, 255, 0.1),
           inset 0 1px 0 rgba(255, 255, 255, 0.1);
       }

       .course-card::before {
         content: '';
         position: absolute;
         top: 0;
         left: 0;
         width: 100%;
         height: 4px;
         background: linear-gradient(90deg, #00ff88, #00aaff, #9742f5, #00ff88);
         background-size: 200% 100%;
         border-radius: 20px 20px 0 0;
         animation: shimmerGlow 4s ease-in-out infinite;
       }

       .course-card::after {
         content: '';
         position: absolute;
         top: -2px;
         left: -2px;
         right: -2px;
         bottom: -2px;
         background: linear-gradient(45deg, #00ff88, #00aaff, #9742f5, #ff0080);
         background-size: 300% 300%;
         border-radius: 22px;
         opacity: 0;
         z-index: -1;
         transition: all 0.4s ease;
         animation: borderGlow 6s linear infinite;
       }

       .course-card:hover {
         transform: translateY(-12px) scale(1.03) rotateX(-3deg) rotateY(3deg);
         box-shadow:
           0 25px 60px rgba(0, 255, 136, 0.25),
           0 10px 30px rgba(0, 170, 255, 0.15),
           0 0 50px rgba(151, 66, 245, 0.1),
           inset 0 1px 0 rgba(255, 255, 255, 0.2);
         border-color: '#00ff88';
       }

       .course-card:hover::after {
         opacity: 0.6;
       }

       @keyframes shimmerGlow {
         0%, 100% { background-position: 0% 0%; }
         50% { background-position: 100% 0%; }
       }

       @keyframes borderGlow {
         0%, 100% { background-position: 0% 50%; }
         25% { background-position: 100% 50%; }
         50% { background-position: 50% 100%; }
         75% { background-position: 50% 0%; }
       }

       .course-image {
         position: relative;
         width: 100%;
         height: 200px;
         overflow: hidden;
         perspective: 1000px;
       }

       .course-image::before {
         content: '';
         position: absolute;
         top: 0;
         left: 0;
         right: 0;
         bottom: 0;
         background: linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(0, 170, 255, 0.05), rgba(151, 66, 245, 0.1));
         opacity: 0;
         transition: opacity 0.4s ease;
         z-index: 1;
       }

       .course-image img {
         width: 100%;
         height: 100%;
         object-fit: cover;
         transition: all 0.5s cubic-bezier(0.23, 1, 0.320, 1);
         filter: brightness(0.9) contrast(1.1);
       }

       .course-card:hover .course-image img {
         transform: scale(1.15) rotateZ(1deg);
         filter: brightness(1.1) contrast(1.2) saturate(1.1);
       }

       .course-card:hover .course-image::before {
         opacity: 0.8;
       }

       .featured-badge {
         position: absolute;
         top: 12px;
         left: 12px;
         background: linear-gradient(135deg, #00ff88 0%, #39ff14 100%);
         color: '#0a1121';
         padding: 6px 12px;
         border-radius: 15px;
         font-size: 0.7rem;
         font-weight: bold;
         text-transform: uppercase;
         font-family: 'Orbitron', sans-serif;
       }

       .course-content {
         padding: 25px;
         flex-grow: 1;
         display: flex;
         flex-direction: column;
         gap: 10px;
       }

       .course-header-section {
         margin-bottom: 0;
       }

       .course-description-section {
         flex-grow: 1;
         margin-bottom: 0;
       }

       .course-footer-section {
         margin-top: 'auto';
         padding-top: '15px';
       }

       .course-meta {
         display: flex;
         justify-content: space-between;
         align-items: center;
         margin-bottom: 15px;
       }

       .difficulty-chip {
         font-size: 0.7rem;
         padding: 6px 12px;
         border-radius: 12px;
         font-family: 'Orbitron', sans-serif;
         font-weight: bold;
         text-transform: uppercase;
         position: relative;
         overflow: hidden;
       }

       .difficulty-chip::before {
         content: '';
         position: absolute;
         top: 0;
         left: 0;
         width: 100%;
         height: 100%;
         background: linear-gradient(135deg,
           rgba(255,255,255,0.2) 0%,
           transparent 50%,
           rgba(255,255,255,0.1) 100%);
         border-radius: 12px;
       }

       .difficulty-chip.beginner {
         background: linear-gradient(135deg, #4caf50, #388e3c);
         color: '#fff';
         box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
       }

       .difficulty-chip.intermediate {
         background: linear-gradient(135deg, #ff9800, #f57c00);
         color: '#fff';
         box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
       }

       .difficulty-chip.advanced {
         background: linear-gradient(135deg, #f44336, #d32f2f);
         color: '#fff';
         box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
       }

       .difficulty-chip.expert {
         background: linear-gradient(135deg, #9c27b0, #7b1fa2);
         color: '#fff';
         box-shadow: 0 2px 8px rgba(156, 39, 176, 0.3);
       }

       .course-meta-info {
         display: flex;
         align-items: center;
         gap: 15px;
         margin-bottom: 15px;
       }

       .student-count {
         color: '#00aaff';
         font-size: 0.8rem;
         font-family: 'Roboto', sans-serif';
       }

       .course-title {
         font-family: 'Orbitron', sans-serif;
         font-size: 1.4rem;
         font-weight: 600;
         margin-bottom: 15px;
         background: linear-gradient(135deg, #ffffff 0%, #00ff88 50%, #00aaff 100%);
         background-size: 200% 100%;
         -webkit-background-clip: text;
         -webkit-text-fill-color: transparent;
         background-clip: text;
         text-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
         cursor: pointer;
         transition: all 0.4s cubic-bezier(0.23, 1, 0.320, 1);
         position: relative;
         overflow: hidden;
       }

       .course-title::before {
         content: '';
         position: absolute;
         top: -2px;
         left: -2px;
         right: -2px;
         bottom: -2px;
         background: linear-gradient(45deg, #00ff88, #00aaff, #9742f5, #00ff88);
         background-size: 300% 300%;
         opacity: 0;
         z-index: -1;
         border-radius: 8px;
         animation: titleGlow 4s linear infinite;
         transition: opacity 0.3s ease;
       }

       .course-title:hover {
         transform: translateY(-2px) scale(1.02);
         text-shadow:
           0 0 30px rgba(0, 255, 136, 0.6),
           0 0 60px rgba(0, 170, 255, 0.4),
           0 0 90px rgba(151, 66, 245, 0.2);
         background-position: 100% 0%;
       }

       .course-title:hover::before {
         opacity: 0.15;
       }

       @keyframes titleGlow {
         0%, 100% { background-position: 0% 50%; }
         25% { background-position: 100% 50%; }
         50% { background-position: 50% 100%; }
         75% { background-position: 50% 0%; }
       }

       .course-description {
         color: '#b8b8b8';
         line-height: 1.6;
         font-size: 0.9rem;
         margin-bottom: 15px;
         flex-grow: 1;
         text-shadow: 0 0 8px rgba(255, 255, 255, 0.05);
         display: -webkit-box;
         -webkit-line-clamp: 3;
         -webkit-box-orient: vertical;
         overflow: hidden;
       }

       .course-duration {
         color: '#00aaff';
         font-weight: 500;
         text-shadow: 0 0 8px rgba(0, 170, 255, 0.3);
         margin-bottom: 15px;
         display: flex;
         align-items: center;
         gap: 8px;
       }

       .course-duration::before {
         content: '⏱️';
         font-size: 1rem;
       }

       .course-meta-row {
         display: flex;
         flex-wrap: wrap;
         gap: 12px;
         align-items: center;
         margin-bottom: 15px;
       }

       .instructor-info {
         display: flex;
         align-items: center;
         gap: 8px;
         color: '#cccccc';
         font-size: 0.8rem;
       }

       .enrollment-count {
         display: flex;
         align-items: center;
         gap: 6px;
         color: '#39ff14';
         font-size: 0.8rem;
         font-weight: 500;
       }

       .enrollment-count::before {
         content: '👥';
         font-size: 0.9rem;
       }

       .category-tags {
         display: flex;
         flex-wrap: wrap;
         gap: 8px;
         margin-bottom: 15px;
       }

       .category-tag {
         background: linear-gradient(135deg, rgba(0, 170, 255, 0.1) 0%, rgba(151, 66, 245, 0.1) 100%);
         color: '#00aaff';
         padding: 5px 10px;
         border-radius: 12px;
         font-size: 0.7rem;
         font-family: 'Orbitron', sans-serif;
         border: 1px solid rgba(0, 170, 255, 0.3);
         text-transform: uppercase;
         transition: all 0.3s cubic-bezier(0.23, 1, 0.320, 1);
         position: relative;
         overflow: hidden;
         box-shadow: 0 2px 8px rgba(0, 170, 255, 0.1);
       }

       .category-tag::before {
         content: '';
         position: absolute;
         top: 0;
         left: -100%;
         width: 100%;
         height: 100%;
         background: linear-gradient(90deg, transparent, rgba(0, 170, 255, 0.3), transparent);
         transition: left 0.5s ease;
       }

       .category-tag:hover {
         transform: translateY(-2px) scale(1.05);
         box-shadow:
           0 4px 12px rgba(0, 170, 255, 0.3),
           0 2px 8px rgba(151, 66, 245, 0.2);
         border-color: rgba(0, 255, 136, 0.5);
         color: '#00ff88';
       }

       .category-tag:hover::before {
         left: 100%;
       }

       .rating-display {
         display: flex;
         align-items: center;
         gap: 8px;
         color: '#ffd700';
         font-size: 0.8rem;
         margin-bottom: 15px;
       }

       .stars {
         display: flex;
         gap: 2px;
       }

       .star {
         color: '#ffd700';
         font-size: 0.9rem;
       }

       .star.empty {
         color: '#666';
       }

       .rating-count {
         color: '#cccccc';
         font-size: 0.7rem;
         margin-left: 4px;
       }

       .progress-section {
         margin-bottom: 15px;
       }

       .progress-label {
         display: flex;
         justify-content: space-between;
         margin-bottom: 8px;
         color: '#cccccc';
         font-size: 0.8rem;
       }

       .progress-bar {
         height: 10px;
         border-radius: 6px;
         background: linear-gradient(135deg, rgba(42, 64, 96, 0.3) 0%, rgba(30, 41, 59, 0.5) 100%);
         margin-bottom: 15px;
         position: relative;
         overflow: hidden;
         box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
       }

       .progress-bar::before {
         content: '';
         position: absolute;
         top: 0;
         left: 0;
         right: 0;
         bottom: 0;
         background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
         animation: progressGlow 3s ease-in-out infinite;
       }

       .progress-fill {
         height: 100%;
         border-radius: 6px;
         background: linear-gradient(90deg, #00ff88 0%, #39ff14 50%, #00aaff 100%);
         background-size: 200% 100%;
         transition: all 0.8s cubic-bezier(0.23, 1, 0.320, 1);
         position: relative;
         box-shadow:
           0 2px 8px rgba(0, 255, 136, 0.4),
           inset 0 1px 0 rgba(255, 255, 255, 0.2);
         animation: progressShimmer 2s ease-in-out infinite;
       }

       .progress-fill::before {
         content: '';
         position: absolute;
         top: -2px;
         left: -2px;
         right: -2px;
         bottom: -2px;
         background: linear-gradient(45deg, #00ff88, #00aaff, #9742f5);
         border-radius: 8px;
         opacity: 0.3;
         z-index: -1;
         animation: progressBorder 4s linear infinite;
       }

       @keyframes progressGlow {
         0%, 100% { opacity: 0.5; }
         50% { opacity: 1; }
       }

       @keyframes progressShimmer {
         0%, 100% { background-position: 0% 0%; }
         50% { background-position: 100% 0%; }
       }

       @keyframes progressBorder {
         0%, 100% { background-position: 0% 50%; }
         25% { background-position: 100% 50%; }
         50% { background-position: 50% 100%; }
         75% { background-position: 50% 0%; }
       }

       .course-actions {
         margin-top: auto;
       }

       .course-button {
         width: 100%;
         background: linear-gradient(135deg, #00ff88 0%, #00cc6d 100%);
         color: '#0a1121';
         border: none;
         border-radius: 25px;
         padding: 15px 30px;
         font-family: 'Orbitron', sans-serif;
         font-size: 1rem;
         font-weight: bold;
         cursor: pointer;
         transition: all 0.4s cubic-bezier(0.23, 1, 0.320, 1);
         text-transform: none;
         box-shadow:
           0 8px 25px rgba(0, 255, 136, 0.4),
           inset 0 1px 0 rgba(255, 255, 255, 0.2);
         position: relative;
         overflow: hidden;
         transform: perspective(1000px) rotateX(0deg);
       }

       .course-button::before {
         content: '';
         position: absolute;
         top: 0;
         left: -100%;
         width: 100%;
         height: 100%;
         background: linear-gradient(90deg,
           transparent 0%,
           rgba(255, 255, 255, 0.3) 50%,
           transparent 100%);
         transition: left 0.6s cubic-bezier(0.23, 1, 0.320, 1);
       }

       .course-button::after {
         content: '';
         position: absolute;
         top: -2px;
         left: -2px;
         right: -2px;
         bottom: -2px;
         background: linear-gradient(45deg, #00ff88, #00aaff, #9742f5, #00ff88);
         background-size: 300% 300%;
         border-radius: 27px;
         opacity: 0;
         z-index: -1;
         animation: buttonGlow 5s linear infinite;
         transition: opacity 0.4s ease;
       }

       .course-button:hover::before {
         left: 100%;
       }

       .course-button:hover {
         transform: perspective(1000px) rotateX(-2deg) translateY(-3px) scale(1.02);
         box-shadow:
           0 15px 35px rgba(0, 255, 136, 0.5),
           0 0 50px rgba(0, 170, 255, 0.3),
           inset 0 1px 0 rgba(255, 255, 255, 0.3);
         background: linear-gradient(135deg, #00cc6d 0%, #00ff88 100%);
       }

       .course-button:hover::after {
         opacity: 0.8;
       }

       .course-button:active {
         transform: perspective(1000px) rotateX(0deg) translateY(-1px) scale(0.98);
         transition: all 0.1s ease;
       }

       @keyframes buttonGlow {
         0%, 100% { background-position: 0% 50%; }
         25% { background-position: 100% 50%; }
         50% { background-position: 50% 100%; }
         75% { background-position: 50% 0%; }
       }

       .continue-course-btn {
         background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%) !important;
       }

       .continue-course-btn:hover {
         background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
       }

       .enroll-btn {
         background: linear-gradient(135deg, #ff6b35 0%, #e55a2b 100%) !important;
       }

       .enroll-btn:hover {
         background: linear-gradient(135deg, #e55a2b 0%, #cc4a24 100%) !important;
       }

       .watch-lecture-btn {
         background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%) !important;
       }

       .watch-lecture-btn:hover {
         background: linear-gradient(135deg, #7b1fa2 0%, #6a1b9a 100%) !important;
       }

       .upgrade-button {
         background: linear-gradient(135deg, #666 0%, #555 100%) !important;
         cursor: not-allowed !important;
       }

       .upgrade-button:hover {
         transform: none !important;
         box-shadow: none !important;
       }

       .courses-grid {
         display: grid;
         grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
         gap: 30px;
         margin-top: 40px;
         width: 100%;
         box-sizing: border-box;
         /* Ensure grid doesn't overflow horizontally */
         min-height: 0; /* Prevents grid from expanding beyond container */
         /* Ensure all cards are visible and accessible */
         justify-items: center;
         align-items: start;
       }

       .courses-grid-wrapper {
         width: 100%;
         overflow-x: auto; /* Allow horizontal scrolling if needed */
         overflow-y: visible; /* Ensure vertical content is visible */
         scroll-behavior: smooth; /* Smooth scrolling */
         scrollbar-width: thin;
         scrollbar-color: #39ff14 #2a4060;
       }

       .courses-grid-wrapper::-webkit-scrollbar {
         height: 8px;
       }

       .courses-grid-wrapper::-webkit-scrollbar-track {
         background: #2a4060;
         border-radius: 4px;
       }

       .courses-grid-wrapper::-webkit-scrollbar-thumb {
         background: #39ff14;
         border-radius: 4px;
         border: 1px solid #2a4060;
       }

       .courses-grid-wrapper::-webkit-scrollbar-thumb:hover {
         background: #00ff88;
       }

       .search-section {
         background: linear-gradient(145deg, #111c30 0%, #0f1626 100%);
         border: 1px solid #2a4060;
         border-radius: 20px;
         padding: 30px;
         margin-bottom: 40px;
       }

       .search-input {
         background: '#0f1626';
         border: 1px solid '#2a4060';
         border-radius: 15px;
         padding: 15px;
         color: '#e0e0e0';
         width: 100%;
         margin-bottom: 20px;
         font-family: 'Roboto', sans-serif;
       }

       .search-input::placeholder {
         color: '#888';
       }

       .filter-row {
         display: grid;
         grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
         gap: 20px;
         align-items: end;
       }

       @media (max-width: 1024px) {
         .courses-grid {
           grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
         }
       }

       @media (max-width: 768px) {
         .courses-title {
           font-size: 2.2rem;
         }

         .courses-grid {
           grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
           gap: 20px;
         }

         .course-card {
           padding: 15px 12px;
         }

         .course-meta-info {
           gap: 8px;
         }

         .course-meta-row {
           gap: 12px;
         }
       }

       @media (max-width: 480px) {
         .courses-title {
           font-size: 1.8rem;
         }

         .courses-subtitle {
           font-size: 1rem;
         }

         .courses-grid {
           grid-template-columns: 1fr;
           gap: 15px;
         }

         .courses-grid-wrapper {
           overflow-x: hidden; /* No need for horizontal scrolling on mobile */
           overflow-y: visible;
         }

         .course-card {
           max-width: 100%;
           width: 100%;
           min-height: 400px; /* Ensure consistent height */
         }

         .course-title {
           font-size: 1.2rem;
         }

         .search-section {
           padding: 20px;
         }

         .filter-row {
           flex-direction: column;
           gap: 15px;
           align-items: stretch;
         }
       }

       /* Additional responsive improvements for course grid visibility */
       @media (min-width: 320px) and (max-width: 1024px) {
         .courses-grid {
           grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
           gap: 20px;
         }

         .course-card {
           width: 100%;
           max-width: 380px; /* Prevent cards from being too wide */
         }
       }

       /* Ensure course cards are always visible */
       .course-card {
         opacity: 1 !important; /* Force visibility */
         visibility: visible !important;
         display: flex !important; /* Ensure flexbox layout */
         flex-direction: column;
         position: relative;
         overflow: hidden;
         border-radius: 20px;
         transition: all 0.4s ease;
         height: auto; /* Let cards size themselves naturally */
         min-height: 450px; /* Minimum height for consistent appearance */
         width: 100%; /* Ensure full width within grid cell */
         box-sizing: border-box;
       }

       /* Improve grid distribution for different screen sizes */
       @media (min-width: 1400px) {
         .courses-grid {
           grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
           gap: 35px;
         }
       }

       @media (min-width: 1200px) and (max-width: 1399px) {
         .courses-grid {
           grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
           gap: 30px;
         }
       }

       .card-glow {
         position: absolute;
         top: -2px;
         left: -2px;
         right: -2px;
         bottom: -2px;
         background: linear-gradient(45deg, #00ff88, #00aaff, #9742f5, #ff0080, #00ff88);
         background-size: 300% 300%;
         animation: cardGlowPulse 4s cubic-bezier(0.23, 1, 0.320, 1) infinite;
         border-radius: 22px;
         z-index: -1;
         opacity: 0;
         transition: opacity 0.4s cubic-bezier(0.23, 1, 0.320, 1);
         filter: blur(1px);
       }

       .course-card:hover .card-glow {
         opacity: 0.4;
         filter: blur(0px);
         animation-duration: 2s;
       }

       @keyframes cardGlowPulse {
         0%, 100% {
           background-position: 0% 50%;
           filter: blur(1px) brightness(1);
         }
         25% {
           background-position: 100% 50%;
         }
         50% {
           background-position: 50% 100%;
           filter: blur(0.5px) brightness(1.2);
         }
         75% {
           background-position: 100% 50%;
         }
       }

       @keyframes glow {
         0% {
           background-position: 0% 50%;
         }
         50% {
           background-position: 100% 50%;
         }
         100% {
           background-position: 0% 50%;
         }
       }

       /* Enhanced floating animation for course cards */
       .course-card:nth-child(1) {
         animation: floatCard 6s ease-in-out infinite;
       }

       .course-card:nth-child(2) {
         animation: floatCard 6s ease-in-out infinite;
         animation-delay: -2s;
       }

       .course-card:nth-child(3) {
         animation: floatCard 6s ease-in-out infinite;
         animation-delay: -4s;
       }

       .course-card:nth-child(4n+4) {
         animation: floatCard 6s ease-in-out infinite;
         animation-delay: -1s;
       }

       .course-card:nth-child(5n+5) {
         animation: floatCard 6s ease-in-out infinite;
         animation-delay: -3s;
       }

       .course-card:nth-child(6n+6) {
         animation: floatCard 6s ease-in-out infinite;
         animation-delay: -5s;
       }

       @keyframes floatCard {
         0%, 100% {
           transform: translateY(0px);
         }
         50% {
           transform: translateY(-6px);
         }
       }

       /* Pause floating animation on card hover for better interaction */
       .course-card:hover {
         animation-play-state: paused;
       }

       .popular-course-badge {
         position: absolute;
         top: 15px;
         right: 15px;
         background: linear-gradient(135deg, #ff6b35, #e55a2b);
         color: white;
         padding: 4px 10px;
         border-radius: 12px;
         font-size: 0.65rem;
         font-weight: bold;
         font-family: 'Orbitron', sans-serif;
         text-transform: uppercase;
         box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
       }
     `}</style>
     <div className="courses-container">
       {/* Header */}
       <div className="courses-header">
         {/* Show user's granted plan information */}
         {userSubscription && userSubscription.plan ? (
           <>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
               <button className="back-button" onClick={() => navigate('/dashboard')}>
                 ← Back to Dashboard
               </button>
               <div className="plan-chip">
                 📚 {userSubscription.plan.name} - Your Active Plan
               </div>
             </div>
             <h1 className="courses-title">Your {userSubscription.plan.name} Courses</h1>
             <p className="courses-subtitle">
               Access all {userSubscription.plan.includedCourses?.length || 0} courses from your granted subscription
             </p>
           </>
         ) : selectedPlan ? (
           <>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
               <button className="back-button" onClick={() => navigate('/dashboard')}>
                 ← Back to Dashboard
               </button>
               <div className="plan-chip">
                 📚 {selectedPlan.name} Plan
               </div>
             </div>
             <h1 className="courses-title">Courses in {selectedPlan.name}</h1>
             <p className="courses-subtitle">
               Preview courses that would be included in this plan
             </p>
           </>
         ) : (
           <>
             <h1 className="courses-title">Available Courses</h1>
             <p className="courses-subtitle">
               Expand your knowledge with our comprehensive cybersecurity courses
             </p>
           </>
         )}
       </div>

       {/* Error Alert */}
       {error && (
         <div style={{
           background: 'rgba(255, 59, 59, 0.1)',
           border: '1px solid #ff3b3b',
           borderRadius: '15px',
           padding: '20px',
           marginBottom: '30px',
           textAlign: 'center',
           color: '#ff3b3b'
         }}>
           {error}
         </div>
       )}

       {/* Search and Filters */}
       <div className="search-section">
         <div className="filter-row">
           <div>
             <input
               type="text"
               className="search-input"
               placeholder="🔍 Search courses..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <div>
             <select
               className="search-input"
               value={difficultyFilter}
               onChange={(e) => setDifficultyFilter(e.target.value)}
               style={{ cursor: 'pointer', marginBottom: '0' }}
             >
               <MenuItem value="all">All Levels</MenuItem>
               <MenuItem value="Beginner">Beginner</MenuItem>
               <MenuItem value="Intermediate">Intermediate</MenuItem>
               <MenuItem value="Advanced">Advanced</MenuItem>
               <MenuItem value="Expert">Expert</MenuItem>
             </select>
           </div>
           <div style={{
             display: 'flex',
             alignItems: 'center',
             color: '#00aaff',
             fontSize: '0.9rem'
           }}>
             {/* Show user's granted plan info */}
             {userSubscription && userSubscription.plan ? (
               <>
                 {filteredCourses.length} of {userSubscription.plan.includedCourses?.length || 0} courses accessible
               </>
             ) : selectedPlan ? (
               <>
                 {filteredCourses.length} of {selectedPlan.includedCourses?.length || 0} courses accessible
                 {filteredCourses.length < (selectedPlan.includedCourses?.length || 0) &&
                   <span style={{ color: '#ff6b35', marginLeft: '8px' }}>
                     (Preview Mode)
                   </span>
                 }
               </>
             ) : (
               <>
                 {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
               </>
             )}
           </div>
         </div>
       </div>

       {/* Courses Grid */}
       {filteredCourses.length === 0 ? (
         <div style={{
           textAlign: 'center',
           padding: '80px 20px',
           color: '#888'
         }}>
           <h3 style={{ marginBottom: '20px', color: '#e0e0e0' }}>No courses found</h3>
           <p>Try adjusting your search criteria or filters</p>
         </div>
       ) : (
         <div className="courses-grid-wrapper">
           <div className="courses-grid">
             {filteredCourses.map((course) => (
               <div className="course-card" key={course._id}>
                 <div className="card-glow"></div>
                 <div className="course-image">
                   
                   {course.featured && (
                     <div className="">
                      
                     </div>
                   )}
                   {(course.enrollments || 0) > 50 && (
                     <div className="popular-course-badge">
                       🔥 Popular
                     </div>
                   )}
                 </div>

               <div className="course-content">
                 {/* Header Section */}
                 <div className="course-header-section">
                   <div className="course-meta">
                     <div className={`difficulty-chip ${course.difficulty?.toLowerCase() || 'intermediate'}`}>
                       {course.difficulty || 'Intermediate'}
                     </div>
                     <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                       {course.enrollmentsVisible && (course.enrollments || 0) > 0 && (
                         <div className="student-count">
                           {course.enrollments || 0}
                         </div>
                       )}
                       {course.featured && (
                         <div style={{
                           background: 'linear-gradient(135deg, #00ff88, #39ff14)',
                           color: '#0a1121',
                           padding: '4px 8px',
                           borderRadius: '8px',
                           fontSize: '0.65rem',
                           fontWeight: 'bold',
                           fontFamily: 'Orbitron, sans-serif',
                           textTransform: 'uppercase'
                         }}>
                           ⭐ Featured
                         </div>
                       )}
                     </div>
                   </div>

                   <h3 className="course-title" onClick={() => handleEnroll(course)}>
                     {course.title}
                   </h3>

                   {/* Instructor and Rating Row */}
                   <div className="course-meta-row">
                     {course.instructor && (
                       <div className="instructor-info">
                         <span>👨‍🏫 {course.instructor}</span>
                       </div>
                     )}
                     {course.rating && typeof course.rating === 'object' && course.rating.average > 0 && (
                       <div className="rating-display">
                         <div className="stars">
                           {[1, 2, 3, 4, 5].map((star) => (
                             <span
                               key={star}
                               className={`star ${star <= Math.round(course.rating.average) ? 'filled' : 'empty'}`}
                             >
                               ★
                             </span>
                           ))}
                         </div>
                         <span>({course.rating.average.toFixed(1)})</span>
                         {course.rating.count && (
                           <span className="rating-count">({course.rating.count})</span>
                         )}
                       </div>
                     )}
                   </div>
                 </div>

                 {/* Description */}
                 <div className="course-description-section">
                   <p className="course-description">
                     {course.shortDescription || course.description?.substring(0, 120) + '...'}
                   </p>
                 </div>

                 {/* Course Categories/Tags */}
                 {course.tags && course.tags.length > 0 && (
                   <div className="category-tags">
                     {course.tags.slice(0, 3).map((tag, index) => (
                       <span key={index} className="category-tag">
                         {tag}
                       </span>
                     ))}
                     {course.tags.length > 3 && (
                       <span className="category-tag">
                         +{course.tags.length - 3}
                       </span>
                     )}
                   </div>
                 )}

                 {/* Progress Bar (for enrolled courses) */}
                 {course.isEnrolled && (
                   <div className="progress-section">
                     <div className="progress-label">
                       <span>📈 Progress</span>
                       <span>{Math.round(course.progress || 0)}%</span>
                     </div>
                     <div className="progress-bar">
                       <div
                         className="progress-fill"
                         style={{ width: `${course.progress || 0}%` }}
                       ></div>
                     </div>
                   </div>
                 )}

                 {/* Course Stats Footer */}
                 <div className="course-footer-section" style={{
                   display: 'flex',
                   justifyContent: 'space-between',
                   alignItems: 'center',
                   marginTop: 'auto',
                   paddingTop: '15px',
                   borderTop: '1px solid rgba(42, 64, 96, 0.3)'
                 }}>
                   <div className="course-duration">
                     {course.duration ? `${Math.floor(course.duration / 60)}h ${course.duration % 60}m` : 'Duration TBA'}
                   </div>
                   {course.enrollmentsVisible && (course.enrollments || 0) > 0 && (
                     <div className="enrollment-count">
                       👥 {course.enrollments || 0} enrolled
                     </div>
                   )}
                 </div>

                 {/* Action Button */}
                 <div className="course-actions">
                   <button
                     className={`course-button ${
                       !course.hasAccess ? 'upgrade-button' :
                       course.isEnrolled ? 'continue-course-btn' :
                       'enroll-btn'
                     }`}
                     onClick={() => handleEnroll(course)}
                   >
                     {getCourseButtonProps(course).label}
                   </button>
                 </div>
               </div>
             </div>
           ))}
           </div>
         </div>
       )}
     </div>
   </div>
  );
};

export default CourseList;
