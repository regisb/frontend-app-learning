import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { sendTrackEvent } from '@edx/frontend-platform/analytics';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';

import Tour from '../tour/Tour';

import { useModel } from '../generic/model-store';

import abandonTour from './AbandonTour';
import coursewareTour from './CoursewareTour';
import existingUserCourseHomeTour from './ExistingUserCourseHomeTour';
import newUserCourseHomeTour from './newUserCourseHomeTour/NewUserCourseHomeTour';
import NewUserCourseHomeTourModal from './newUserCourseHomeTour/NewUserCourseHomeTourModal';
import {
  closeNewUserCourseHomeModal,
  endCourseHomeTour,
  endCoursewareTour,
  fetchTourData,
} from './data/thunks';

function ProductTours({
  activeTab,
  courseId,
  isStreakCelebrationOpen,
  metadataModel,
  org,
}) {
  if (isStreakCelebrationOpen) {
    return null;
  }

  const {
    username,
    verifiedMode,
  } = useModel(metadataModel, courseId);

  const {
    showCoursewareTour,
    showExistingUserCourseHomeTour,
    showNewUserCourseHomeModal,
    showNewUserCourseHomeTour,
  } = useSelector(state => state.tours);

  const [isAbandonTourEnabled, setIsAbandonTourEnabled] = useState(false);
  const [isCoursewareTourEnabled, setIsCoursewareTourEnabled] = useState(false);
  const [isExistingUserCourseHomeTourEnabled, setIsExistingUserCourseHomeTourEnabled] = useState(false);
  const [isNewUserCourseHomeTourEnabled, setIsNewUserCourseHomeTourEnabled] = useState(false);

  const dispatch = useDispatch();
  const administrator = getAuthenticatedUser() && getAuthenticatedUser().administrator;

  useEffect(() => {
    // Tours currently only exist on the Outline Tab and within Courseware, so we'll avoid
    // calling the tour endpoint unnecessarily.
    if (username && (activeTab === 'outline' || metadataModel === 'coursewareMeta')) {
      dispatch(fetchTourData(username));
    }
  }, []);

  useEffect(() => {
    if (metadataModel === 'coursewareMeta' && showCoursewareTour) {
      setIsCoursewareTourEnabled(true);
    }
  }, [showCoursewareTour]);

  useEffect(() => {
    if (metadataModel === 'courseHomeMeta') {
      setIsExistingUserCourseHomeTourEnabled(!!showExistingUserCourseHomeTour);
    }
  }, [showExistingUserCourseHomeTour]);

  useEffect(() => {
    if (metadataModel === 'courseHomeMeta' && showNewUserCourseHomeTour) {
      setIsAbandonTourEnabled(false);
      setIsNewUserCourseHomeTourEnabled(true);
    }
  }, [showNewUserCourseHomeTour]);

  const upgradeData = {
    courseId,
    org,
    upgradeUrl: verifiedMode && verifiedMode.upgradeUrl,
  };

  // The <Tour /> component cannot handle rendering multiple enabled tours at once.
  // I.e. when adding new tours, beware that if multiple tours are enabled,
  // the first enabled tour in the following array will be the only one that renders.
  // The suggestion for populating these tour objects is to ensure only one tour is enabled at a time.
  const tours = [
    abandonTour({
      enabled: isAbandonTourEnabled,
      onEnd: () => setIsAbandonTourEnabled(false),
    }),
    coursewareTour({
      enabled: isCoursewareTourEnabled,
      onEnd: () => {
        setIsCoursewareTourEnabled(false);
        sendTrackEvent('edx.ui.lms.courseware_tour.completed', {
          org_key: org,
          courserun_key: courseId,
          is_staff: administrator,
        });
        dispatch(endCoursewareTour(username));
      },
    }),
    existingUserCourseHomeTour({
      enabled: isExistingUserCourseHomeTourEnabled,
      onEnd: () => {
        setIsExistingUserCourseHomeTourEnabled(false);
        sendTrackEvent('edx.ui.lms.existing_user_tour.completed', {
          org_key: org,
          courserun_key: courseId,
          is_staff: administrator,
        });
        dispatch(endCourseHomeTour(username));
      },
    }),
    newUserCourseHomeTour({
      enabled: isNewUserCourseHomeTourEnabled,
      onDismiss: () => {
        setIsNewUserCourseHomeTourEnabled(false);
        setIsAbandonTourEnabled(true);
        sendTrackEvent('edx.ui.lms.new_user_tour.dismissed', {
          org_key: org,
          courserun_key: courseId,
          is_staff: administrator,
        });
        dispatch(endCourseHomeTour(username));
      },
      onEnd: () => {
        setIsNewUserCourseHomeTourEnabled(false);
        sendTrackEvent('edx.ui.lms.new_user_tour.completed', {
          org_key: org,
          courserun_key: courseId,
          is_staff: administrator,
        });
        dispatch(endCourseHomeTour(username));
      },
      upgradeData,
    }),
  ];

  return (
    <>
      <Tour
        tours={tours}
      />
      <NewUserCourseHomeTourModal
        isOpen={metadataModel === 'courseHomeMeta' && showNewUserCourseHomeModal}
        onDismiss={() => {
          sendTrackEvent('edx.ui.lms.new_user_modal.dismissed', {
            org_key: org,
            courserun_key: courseId,
            is_staff: administrator,
          });
          dispatch(closeNewUserCourseHomeModal());
          setIsAbandonTourEnabled(true);
          dispatch(endCourseHomeTour(username));
        }}
        onStartTour={() => {
          sendTrackEvent('edx.ui.lms.new_user_tour.started', {
            org_key: org,
            courserun_key: courseId,
            is_staff: administrator,
          });
          dispatch(closeNewUserCourseHomeModal());
          setIsNewUserCourseHomeTourEnabled(true);
        }}
      />
    </>
  );
}

ProductTours.propTypes = {
  activeTab: PropTypes.string.isRequired,
  courseId: PropTypes.string.isRequired,
  isStreakCelebrationOpen: PropTypes.bool.isRequired,
  metadataModel: PropTypes.string.isRequired,
  org: PropTypes.string.isRequired,
};

export default ProductTours;
