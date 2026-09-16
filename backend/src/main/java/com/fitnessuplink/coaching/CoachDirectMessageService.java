package com.fitnessuplink.coaching;

import com.fitnessuplink.coaching.dto.CoachingDtos.CoachInboxItemDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.DirectMessageDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.MemberInboxItemDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.SendDirectMessageRequest;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CoachDirectMessageService {

    private final CoachDirectMessageRepository directMessageRepository;
    private final UserRepository userRepository;
    private final CoachSearchService coachSearchService;
    private final NotificationService notificationService;

    private List<DirectMessageDto> toDto(List<CoachDirectMessage> messages) {
        List<UUID> senderIds = messages.stream().map(CoachDirectMessage::getSenderId).distinct().toList();
        Map<UUID, String> names = userRepository.findByIdIn(senderIds).stream()
                .collect(Collectors.toMap(User::getId, User::getDisplayName));
        return messages.stream()
                .map(m -> new DirectMessageDto(m.getId(), m.getSenderId(),
                        names.getOrDefault(m.getSenderId(), "Utilisateur"), m.getBody(), m.getCreatedAt()))
                .toList();
    }

    /** Member fetches their own thread with a coach */
    @Transactional(readOnly = true)
    public List<DirectMessageDto> thread(User member, UUID coachId) {
        List<CoachDirectMessage> messages =
                directMessageRepository.findByCoachIdAndMemberIdOrderByCreatedAtAsc(coachId, member.getId());
        return toDto(messages);
    }

    /** Coach fetches the inbox: one row per member, latest message first */
    @Transactional(readOnly = true)
    public List<CoachInboxItemDto> listInbox(User coach) {
        coachSearchService.requireCoach(coach.getId());
        List<CoachDirectMessage> latest = directMessageRepository.findLatestPerMemberByCoachId(coach.getId());
        List<UUID> memberIds = latest.stream().map(CoachDirectMessage::getMemberId).distinct().toList();
        Map<UUID, String> names = userRepository.findByIdIn(memberIds).stream()
                .collect(Collectors.toMap(User::getId, User::getDisplayName));
        return latest.stream()
                .map(m -> new CoachInboxItemDto(
                        m.getMemberId(),
                        names.getOrDefault(m.getMemberId(), "Membre"),
                        m.getBody(),
                        m.getCreatedAt()))
                .toList();
    }

    /** Member fetches their inbox: one row per coach, latest message first */
    @Transactional(readOnly = true)
    public List<MemberInboxItemDto> listMemberInbox(User member) {
        List<CoachDirectMessage> latest = directMessageRepository.findLatestPerCoachByMemberId(member.getId());
        List<UUID> coachIds = latest.stream().map(CoachDirectMessage::getCoachId).distinct().toList();
        Map<UUID, String> names = userRepository.findByIdIn(coachIds).stream()
                .collect(Collectors.toMap(User::getId, User::getDisplayName));
        return latest.stream()
                .map(m -> new MemberInboxItemDto(
                        m.getCoachId(),
                        names.getOrDefault(m.getCoachId(), "Coach"),
                        m.getBody(),
                        m.getCreatedAt()))
                .toList();
    }

    /** Coach fetches thread with a specific member */
    @Transactional(readOnly = true)
    public List<DirectMessageDto> coachInbox(User coach, UUID memberId) {        coachSearchService.requireCoach(coach.getId());
        List<CoachDirectMessage> messages =
                directMessageRepository.findByCoachIdAndMemberIdOrderByCreatedAtAsc(coach.getId(), memberId);
        return toDto(messages);
    }

    /** Member sends a message to a coach */
    @Transactional
    public DirectMessageDto send(User sender, UUID coachId, SendDirectMessageRequest request) {
        if (request.body() == null || request.body().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MESSAGE_EMPTY");
        }
        // Verify coach exists and is active
        coachSearchService.requireCoach(coachId);
        CoachDirectMessage msg = CoachDirectMessage.builder()
                .id(UUID.randomUUID())
                .coachId(coachId)
                .memberId(sender.getId())
                .senderId(sender.getId())
                .body(request.body().trim())
                .createdAt(Instant.now())
                .build();
        directMessageRepository.save(msg);
        notificationService.notify(coachId, NotifyCategory.MESSAGE,
                "Nouveau message", sender.getDisplayName() + " vous a envoyé un message.",
                "Voir", "/app/coaching/agenda");
        return new DirectMessageDto(msg.getId(), sender.getId(), sender.getDisplayName(), msg.getBody(), msg.getCreatedAt());
    }

    /** Coach replies to a member */
    @Transactional
    public DirectMessageDto coachReply(User coach, UUID memberId, SendDirectMessageRequest request) {
        if (request.body() == null || request.body().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MESSAGE_EMPTY");
        }
        coachSearchService.requireCoach(coach.getId());
        CoachDirectMessage msg = CoachDirectMessage.builder()
                .id(UUID.randomUUID())
                .coachId(coach.getId())
                .memberId(memberId)
                .senderId(coach.getId())
                .body(request.body().trim())
                .createdAt(Instant.now())
                .build();
        directMessageRepository.save(msg);
        notificationService.notify(memberId, NotifyCategory.MESSAGE,
                "Réponse du coach", coach.getDisplayName() + " vous a répondu.",
                "Voir", "/app/coaching/bookings");
        return new DirectMessageDto(msg.getId(), coach.getId(), coach.getDisplayName(), msg.getBody(), msg.getCreatedAt());
    }
}
